param(
    [string] $Root = "",
    [switch] $Json
)

$ErrorActionPreference = "Stop"

if (-not $Root) {
    $Root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "../../../.."))
}
$Root = (Resolve-Path -LiteralPath $Root).Path

$results = New-Object System.Collections.Generic.List[object]

function Add-Result {
    param(
        [string] $Name,
        [ValidateSet("pass", "fail")]
        [string] $Status,
        [string] $Message
    )
    $results.Add([pscustomobject]@{
        name = $Name
        status = $Status
        message = $Message
    })
}

function Get-RelativePath {
    param([string] $Path)
    $full = [System.IO.Path]::GetFullPath($Path)
    if ($full.StartsWith($Root, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $full.Substring($Root.Length).TrimStart("\", "/").Replace("\", "/")
    }
    return $full.Replace("\", "/")
}

function Test-Utf8Bom {
    param([string] $Path)
    $bytes = [System.IO.File]::ReadAllBytes($Path)
    return $bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF
}

$skillsRoot = Join-Path $Root ".agents/skills"
$skillFiles = @(Get-ChildItem -LiteralPath $skillsRoot -Recurse -Filter "SKILL.md" -File | Sort-Object FullName)
if ($skillFiles.Count -eq 0) {
    Add-Result "skills" "fail" "No repository SKILL.md files found"
} else {
    Add-Result "skills" "pass" "Found $($skillFiles.Count) repository skills"
}

$skillNames = @{}
$descriptionTotal = 0
foreach ($file in $skillFiles) {
    $relative = Get-RelativePath $file.FullName
    if (Test-Utf8Bom $file.FullName) {
        Add-Result "bom:$relative" "fail" "SKILL.md must not contain a UTF-8 BOM"
        continue
    }

    $text = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8
    $frontmatter = [regex]::Match($text, "(?s)\A---\r?\n(.*?)\r?\n---")
    if (-not $frontmatter.Success) {
        Add-Result "frontmatter:$relative" "fail" "Missing YAML frontmatter at file start"
        continue
    }

    $nameMatch = [regex]::Match($frontmatter.Groups[1].Value, "(?m)^name:\s*([^\r\n]+)$")
    $descriptionMatch = [regex]::Match($frontmatter.Groups[1].Value, "(?m)^description:\s*(.+)$")
    if (-not $nameMatch.Success -or -not $descriptionMatch.Success) {
        Add-Result "frontmatter:$relative" "fail" "Frontmatter requires single-line name and description"
        continue
    }

    $name = $nameMatch.Groups[1].Value.Trim().Trim('"', "'")
    $description = $descriptionMatch.Groups[1].Value.Trim().Trim('"', "'")
    if ($name -notmatch "^[a-z0-9-]+$") {
        Add-Result "name:$relative" "fail" "Invalid skill name: $name"
    } elseif ($skillNames.ContainsKey($name.ToLowerInvariant())) {
        Add-Result "name:$relative" "fail" "Duplicate skill name '$name' also used by $($skillNames[$name.ToLowerInvariant()])"
    } else {
        $skillNames[$name.ToLowerInvariant()] = $relative
        Add-Result "skill:$name" "pass" "$relative; description $($description.Length) chars"
    }
    $descriptionTotal += $description.Length

    $openaiYaml = Join-Path $file.Directory.FullName "agents/openai.yaml"
    if (Test-Path -LiteralPath $openaiYaml) {
        $yamlText = Get-Content -LiteralPath $openaiYaml -Raw -Encoding UTF8
        if ($yamlText -notmatch "(?m)^interface:\s*$" -or
            $yamlText -notmatch "(?m)^\s+display_name:\s*.+$" -or
            $yamlText -notmatch "(?m)^\s+short_description:\s*.+$") {
            Add-Result "openai-yaml:$name" "fail" "agents/openai.yaml is missing interface metadata"
        } else {
            $policyMatch = [regex]::Match($yamlText, "(?m)^\s+allow_implicit_invocation:\s*(\S+)\s*$")
            if ($policyMatch.Success -and $policyMatch.Groups[1].Value -notin @("true", "false")) {
                Add-Result "openai-yaml:$name" "fail" "allow_implicit_invocation must be true or false"
            } else {
                Add-Result "openai-yaml:$name" "pass" "agents/openai.yaml metadata is present"
            }
        }
    }
}

if ($descriptionTotal -le 4000) {
    Add-Result "description-budget" "pass" "Total repository skill description budget: $descriptionTotal/4000 chars"
} else {
    Add-Result "description-budget" "fail" "Repository skill descriptions use $descriptionTotal chars; limit is 4000"
}

$requiredSddPaths = @(
    ".codex/config.toml",
    ".agents/skills/sdd-explore/SKILL.md",
    ".agents/skills/sdd-explore/references/alignment-contract.md",
    ".agents/skills/tyou-dev/scripts/check-change-boundary.ps1",
    ".agents/skills/tyou-dev/scripts/check-project-knowledge.ps1",
    ".agents/skills/tyou-dev/evals/run-codex-routing-evals.ps1"
)
$missingSddPaths = @($requiredSddPaths | Where-Object { -not (Test-Path -LiteralPath (Join-Path $Root $_)) })
if ($missingSddPaths.Count -eq 0) {
    Add-Result "workflow-paths" "pass" "Config, SDD contract, checkers, and eval runner are present"
} else {
    Add-Result "workflow-paths" "fail" ("Missing workflow paths: " + ($missingSddPaths -join ", "))
}

$requiredMarkers = [ordered]@{
    "AGENTS.md" = @("alignment-contract.md", "Project Knowledge", "Codex Memories", "sdd-explore", "skill-creator", "topic reference")
    "Books/AI-Development-Workflow.md" = @("alignment-contract.md", "Project Knowledge", "Codex Memories", "smoke", "full", "topic reference")
    ".agents/skills/sdd-explore/SKILL.md" = @("alignment-contract.md", "Single rule source", "Project Knowledge")
    ".agents/skills/tyou-dev/SKILL.md" = @("alignment-contract.md", "Project Knowledge", "skill-creator")
    ".agents/skills/tyou-dev/references/codex-native-workflow.md" = @(".codex/config.toml", "alignment-contract.md", "Project Knowledge", "Codex Memories")
    ".agents/skills/tyou-dev/references/memory-workflow.md" = @("Project Knowledge", "topic reference")
    ".agents/skills/wiki-sync/SKILL.md" = @("Project Knowledge", "topic reference")
}
foreach ($entry in $requiredMarkers.GetEnumerator()) {
    $path = Join-Path $Root $entry.Key
    if (-not (Test-Path -LiteralPath $path)) {
        Add-Result "sdd-markers:$($entry.Key)" "fail" "File is missing"
        continue
    }
    $text = Get-Content -LiteralPath $path -Raw -Encoding UTF8
    $missing = @($entry.Value | Where-Object { $text.IndexOf($_, [System.StringComparison]::Ordinal) -lt 0 })
    if ($missing.Count -eq 0) {
        Add-Result "sdd-markers:$($entry.Key)" "pass" "Required SDD markers are present"
    } else {
        Add-Result "sdd-markers:$($entry.Key)" "fail" ("Missing markers: " + ($missing -join ", "))
    }
}

$configPath = Join-Path $Root ".codex/config.toml"
if (Test-Path -LiteralPath $configPath -PathType Leaf) {
    $configText = Get-Content -LiteralPath $configPath -Raw -Encoding UTF8
    $configMarkers = @('model = "gpt-5.6-sol"', 'model_reasoning_effort = "high"', 'plan_mode_reasoning_effort = "xhigh"')
    $missing = @($configMarkers | Where-Object { $configText.IndexOf($_, [System.StringComparison]::Ordinal) -lt 0 })
    if ($missing.Count -eq 0) {
        Add-Result "project-config" "pass" "Model and high/xhigh defaults are declared"
    } else {
        Add-Result "project-config" "fail" ("Missing config markers: " + ($missing -join ", "))
    }
}

$contractPath = Join-Path $Root ".agents/skills/sdd-explore/references/alignment-contract.md"
$contractMarkers = @("Allowed changes/contracts:", "Known unknowns:", "Re-alignment conditions:")
if (Test-Path -LiteralPath $contractPath -PathType Leaf) {
    $contractText = Get-Content -LiteralPath $contractPath -Raw -Encoding UTF8
    $missing = @($contractMarkers | Where-Object { $contractText.IndexOf($_, [System.StringComparison]::Ordinal) -lt 0 })
    if ($missing.Count -eq 0) {
        Add-Result "sdd-single-source" "pass" "Detailed contract fields are present in alignment-contract.md"
    } else {
        Add-Result "sdd-single-source" "fail" ("Contract source missing markers: " + ($missing -join ", "))
    }
}

$summaryFiles = @(
    "AGENTS.md",
    "Books/AI-Development-Workflow.md",
    ".agents/skills/sdd-explore/SKILL.md",
    ".agents/skills/tyou-dev/SKILL.md",
    ".agents/skills/tyou-dev/references/codex-native-workflow.md",
    ".codex/memory/INDEX.md"
)
$duplicates = New-Object System.Collections.Generic.List[string]
foreach ($relative in $summaryFiles) {
    $path = Join-Path $Root $relative
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { continue }
    $text = Get-Content -LiteralPath $path -Raw -Encoding UTF8
    foreach ($marker in $contractMarkers) {
        if ($text.IndexOf($marker, [System.StringComparison]::Ordinal) -ge 0) {
            $duplicates.Add("$relative -> $marker")
        }
    }
}
if ($duplicates.Count -eq 0) {
    Add-Result "sdd-no-detail-duplication" "pass" "Detailed contract fields exist only in the contract source"
} else {
    Add-Result "sdd-no-detail-duplication" "fail" ($duplicates -join "; ")
}

$tyouSkillPath = Join-Path $Root ".agents/skills/tyou-dev/SKILL.md"
if (Test-Path -LiteralPath $tyouSkillPath -PathType Leaf) {
    $tyouSkillText = Get-Content -LiteralPath $tyouSkillPath -Raw -Encoding UTF8
    $rootRuleCopies = @(
        "check-cocos-iterable-spread.mjs",
        "git diff --check",
        "new Node()",
        "[...set]"
    )
    $copiedRules = @($rootRuleCopies | Where-Object { $tyouSkillText.IndexOf($_, [System.StringComparison]::Ordinal) -ge 0 })
    if ($copiedRules.Count -eq 0) {
        Add-Result "tyou-root-rule-dedup" "pass" "tyou-dev routes to root redlines instead of copying them"
    } else {
        Add-Result "tyou-root-rule-dedup" "fail" ("Root rules copied into tyou-dev: " + ($copiedRules -join "; "))
    }
}

$knowledgeScript = Join-Path $Root ".agents/skills/tyou-dev/scripts/check-project-knowledge.ps1"
if (Test-Path -LiteralPath $knowledgeScript -PathType Leaf) {
    $knowledgeOutput = & powershell -NoProfile -ExecutionPolicy Bypass -File $knowledgeScript -Root $Root 2>&1
    if ($LASTEXITCODE -eq 0) {
        Add-Result "project-knowledge" "pass" (($knowledgeOutput | Select-Object -Last 1) -join "")
    } else {
        Add-Result "project-knowledge" "fail" (($knowledgeOutput | Out-String).Trim())
    }
}

$evalPath = Join-Path $Root ".agents/skills/tyou-dev/evals/evals.json"
if (Test-Path -LiteralPath $evalPath -PathType Leaf) {
    try {
        $evalConfig = Get-Content -LiteralPath $evalPath -Raw -Encoding UTF8 | ConvertFrom-Json
        $caseIds = @($evalConfig.cases.id)
        $smokeIds = @($evalConfig.smoke_cases)
        $requiredCases = @("shader-dissolve-feature", "project-knowledge-record", "nested-framework-override", "nested-extension-override", "workflow-doc-mechanical-sync", "localization-table-only")
        $missingCases = @($requiredCases | Where-Object { $_ -notin $caseIds })
        $invalidSmoke = @($smokeIds | Where-Object { $_ -notin $caseIds })
        $invalidSkillCases = New-Object System.Collections.Generic.List[string]
        foreach ($case in @($evalConfig.cases)) {
            $expected = @($case.expected_skills | ForEach-Object { ([string]$_).ToLowerInvariant() })
            $optional = @()
            if ($case.PSObject.Properties.Name -contains "optional_skills") {
                $optional = @($case.optional_skills | ForEach-Object { ([string]$_).ToLowerInvariant() })
            }
            $forbidden = @($case.forbidden_skills | ForEach-Object { ([string]$_).ToLowerInvariant() })
            if (@($expected | Group-Object | Where-Object Count -gt 1).Count -gt 0 -or
                @($optional | Group-Object | Where-Object Count -gt 1).Count -gt 0 -or
                @($expected | Where-Object { $_ -in $optional -or $_ -in $forbidden }).Count -gt 0 -or
                @($optional | Where-Object { $_ -in $forbidden }).Count -gt 0) {
                $invalidSkillCases.Add($case.id)
            }
        }
        if ([int]$evalConfig.schema_version -ge 5 -and
            $smokeIds.Count -ge 4 -and $smokeIds.Count -lt $caseIds.Count -and
            $missingCases.Count -eq 0 -and $invalidSmoke.Count -eq 0 -and $invalidSkillCases.Count -eq 0) {
            Add-Result "eval-profiles" "pass" "Smoke=$($smokeIds.Count), full=$($caseIds.Count), required coverage cases are present"
        } else {
            Add-Result "eval-profiles" "fail" "Invalid schema, smoke/full profiles, skill sets, or missing coverage cases"
        }
    } catch {
        Add-Result "eval-profiles" "fail" "Invalid evals.json: $($_.Exception.Message)"
    }
}

$agentFiles = @(
    Get-Item -LiteralPath (Join-Path $Root "AGENTS.md") -ErrorAction SilentlyContinue
) + @(
    Get-ChildItem -LiteralPath $Root -Recurse -Filter "AGENTS.override.md" -File -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notmatch "[\\/]node_modules[\\/]" }
)
foreach ($file in $agentFiles) {
    if (-not $file) { continue }
    $relative = Get-RelativePath $file.FullName
    $limit = 8192
    if ($relative -eq "AGENTS.md") { $limit = 12288 }
    if ($file.Length -le $limit) {
        Add-Result "agents-size:$relative" "pass" "$($file.Length)/$limit bytes"
    } else {
        Add-Result "agents-size:$relative" "fail" "$($file.Length) bytes exceeds $limit"
    }
}

$retiredPaths = @(
    ".agents/skills/openspec-explore",
    ".agents/skills/openspec-propose",
    ".agents/skills/openspec-apply-change",
    ".agents/skills/openspec-archive-change",
    ".agents/skills/tyou-dev/references/openspec-workflow.md",
    ".agents/skills/tyou-dev/templates/run-report.md",
    ".agents/skills/tyou-dev/scripts/codex-observability-check.ps1",
    ".agents/skills/tyou-dev/scripts/check-sdd-scope.ps1",
    ".agents/skills/tyou-dev/tests/check-sdd-scope.test.ps1",
    "openspec"
)
$remainingRetired = @($retiredPaths | Where-Object { Test-Path -LiteralPath (Join-Path $Root $_) })
if ($remainingRetired.Count -eq 0) {
    Add-Result "retired-workflow-paths" "pass" "No OpenSpec artifacts or active workflow paths remain"
} else {
    Add-Result "retired-workflow-paths" "fail" ("Retired active paths still exist: " + ($remainingRetired -join ", "))
}

$activeFiles = New-Object System.Collections.Generic.List[System.IO.FileInfo]
foreach ($path in @("AGENTS.md", "README.md", "Books/AI-Development-Workflow.md", "wiki-sync.yaml")) {
    $full = Join-Path $Root $path
    if (Test-Path -LiteralPath $full) { $activeFiles.Add((Get-Item -LiteralPath $full)) }
}
foreach ($directory in @(".agents/skills", ".codex/memory")) {
    $full = Join-Path $Root $directory
    if (Test-Path -LiteralPath $full) {
        Get-ChildItem -LiteralPath $full -Recurse -File |
            Where-Object { $_.Extension -in @(".md", ".yaml", ".yml", ".ps1", ".json") } |
            Where-Object { $_.FullName -ne $PSCommandPath } |
            ForEach-Object { $activeFiles.Add($_) }
    }
}

$legacyPatterns = [ordered]@{
    "mandatory-openspec" = "(?i)(L2\+.{0,40}\bOpenSpec\b|\bOpenSpec\b.{0,40}\b(gate|mandatory|required)\b)"
    "run-report" = "run-report\.md"
    "legacy-sensor" = "codex-observability-check\.ps1"
    "diff-budget" = "Diff Budget|ApprovedSourceMax|ApprovedGeneratedMax"
    "file-count-sdd-threshold" = "ApprovedSourceMax|ApprovedGeneratedMax|150%"
}
foreach ($entry in $legacyPatterns.GetEnumerator()) {
    $hits = New-Object System.Collections.Generic.List[string]
    foreach ($file in $activeFiles) {
        $text = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
        if ($text -match $entry.Value) {
            $hits.Add((Get-RelativePath $file.FullName))
        }
    }
    if ($hits.Count -eq 0) {
        Add-Result "legacy:$($entry.Key)" "pass" "No active references found"
    } else {
        Add-Result "legacy:$($entry.Key)" "fail" ("Active references found in: " + (($hits | Sort-Object -Unique) -join ", "))
    }
}

$summary = [pscustomobject]@{
    root = $Root
    results = $results
    totals = [pscustomobject]@{
        pass = @($results | Where-Object { $_.status -eq "pass" }).Count
        fail = @($results | Where-Object { $_.status -eq "fail" }).Count
    }
}

if ($Json) {
    $summary | ConvertTo-Json -Depth 6
} else {
    "Codex workflow check"
    foreach ($result in $results) {
        "[{0}] {1}: {2}" -f $result.status.ToUpperInvariant(), $result.name, $result.message
    }
    "Summary: pass=$($summary.totals.pass) fail=$($summary.totals.fail)"
}

if ($summary.totals.fail -gt 0) { exit 1 }
