param(
    [ValidateSet("medium", "high", "xhigh", "max")]
    [string] $Reasoning = "high",
    [ValidateSet("smoke", "full")]
    [string] $Suite = "smoke",
    [string[]] $Case = @(),
    [ValidateRange(30, 1800)]
    [int] $CaseTimeoutSeconds = 240,
    [switch] $List
)

$ErrorActionPreference = "Stop"
$evalDir = $PSScriptRoot
$root = [System.IO.Path]::GetFullPath((Join-Path $evalDir "../../../.."))
$root = (Resolve-Path -LiteralPath $root).Path
$evalConfig = Get-Content -LiteralPath (Join-Path $evalDir "evals.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$codexCommand = Get-Command "codex.cmd" -ErrorAction SilentlyContinue
if (-not $codexCommand) { $codexCommand = Get-Command "codex" -ErrorAction Stop }
$codexExecutable = $codexCommand.Source
$codexPrefixArgs = @()
if ($codexCommand.Name -like "*.cmd") {
    $codexJs = Join-Path (Split-Path $codexCommand.Source -Parent) "node_modules/@openai/codex/bin/codex.js"
    $nodeCommand = Get-Command "node.exe" -ErrorAction SilentlyContinue
    if ((Test-Path -LiteralPath $codexJs) -and $nodeCommand) {
        $codexExecutable = $nodeCommand.Source
        $codexPrefixArgs = @($codexJs)
    }
}

$normalizedCases = New-Object System.Collections.Generic.List[string]
foreach ($entry in $Case) {
    foreach ($id in ($entry -split ",")) {
        $trimmed = $id.Trim()
        if ($trimmed) { $normalizedCases.Add($trimmed) }
    }
}
$Case = @($normalizedCases)

if ($evalConfig.reasoning_efforts -notcontains $Reasoning) {
    throw "Reasoning '$Reasoning' is not declared by evals.json"
}

$allCases = @($evalConfig.cases)
$cases = $allCases
if ($Case.Count -gt 0) {
    $cases = @($cases | Where-Object { $Case -contains $_.id })
    $missing = @($Case | Where-Object { $_ -notin @($cases.id) })
    if ($missing.Count -gt 0) { throw "Unknown eval case(s): $($missing -join ', ')" }
} elseif ($Suite -eq "smoke") {
    $smokeIds = @($evalConfig.smoke_cases)
    if ($smokeIds.Count -eq 0) { throw "evals.json does not declare smoke_cases" }
    $missing = @($smokeIds | Where-Object { $_ -notin @($allCases.id) })
    if ($missing.Count -gt 0) { throw "Unknown smoke case(s): $($missing -join ', ')" }
    $cases = @($allCases | Where-Object { $smokeIds -contains $_.id })
}

if ($List) {
    $cases | ForEach-Object {
        $workdir = if ($_.PSObject.Properties.Name -contains "workdir") { $_.workdir } else { "." }
        "{0} [{1}]: {2}" -f $_.id, $workdir, $_.prompt
    }
    exit 0
}

$schema = @{
    type = "object"
    additionalProperties = $false
    required = @("mode", "skills", "requires_confirmation", "uses_openspec", "alignment_required", "change_contract_required", "file_count_is_gate", "implementation_may_start", "validation", "rationale")
    properties = @{
        mode = @{ type = "string"; enum = @("Direct", "Planned", "Deep") }
        skills = @{ type = "array"; items = @{ type = "string" } }
        requires_confirmation = @{ type = "boolean" }
        uses_openspec = @{ type = "boolean" }
        alignment_required = @{ type = "boolean" }
        change_contract_required = @{ type = "boolean" }
        file_count_is_gate = @{ type = "boolean" }
        implementation_may_start = @{ type = "boolean" }
        validation = @{ type = "array"; items = @{ type = "string" } }
        rationale = @{ type = "string" }
    }
}

$schemaPath = [System.IO.Path]::GetTempFileName()
$outputPath = [System.IO.Path]::GetTempFileName()
$promptPath = [System.IO.Path]::GetTempFileName()
$stdoutPath = [System.IO.Path]::GetTempFileName()
$stderrPath = [System.IO.Path]::GetTempFileName()
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($schemaPath, ($schema | ConvertTo-Json -Depth 10), $utf8NoBom)
$results = New-Object System.Collections.Generic.List[object]

function Stop-ProcessTree {
    param([int] $RootProcessId)
    $children = @(
        Get-CimInstance Win32_Process -Filter "ParentProcessId = $RootProcessId" -ErrorAction SilentlyContinue
    )
    foreach ($child in $children) { Stop-ProcessTree -RootProcessId $child.ProcessId }
    Stop-Process -Id $RootProcessId -Force -ErrorAction SilentlyContinue
}

try {
    foreach ($item in $cases) {
        $caseRoot = $root
        if ($item.PSObject.Properties.Name -contains "workdir") {
            $candidateRoot = [System.IO.Path]::GetFullPath((Join-Path $root $item.workdir))
            $rootPrefix = $root.TrimEnd("\", "/") + [System.IO.Path]::DirectorySeparatorChar
            if (-not $candidateRoot.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase) -or
                -not (Test-Path -LiteralPath $candidateRoot -PathType Container)) {
                throw "Invalid case workdir for $($item.id): $($item.workdir)"
            }
            $caseRoot = $candidateRoot
        }
        $relativeCaseRoot = $caseRoot.Substring($root.Length).TrimStart("\", "/").Replace("\", "/")
        if (-not $relativeCaseRoot) { $relativeCaseRoot = "." }
        Write-Output "[RUN] $($item.id) ($($evalConfig.model), $Reasoning, $relativeCaseRoot)"
        $prompt = @(
            "This is a read-only Tyou Codex routing regression. Do not actually execute the task, edit files, invoke shell commands, or call external tools. Classify as if the original request below would be executed; every output field must describe that hypothetical execution, not this regression wrapper.",
            "",
            "Classify the following request using the active AGENTS instructions and available skill metadata:",
            "STARTING WORKDIR: $relativeCaseRoot",
            "ORIGINAL REQUEST: $($item.prompt)",
            "",
            "Field requirements:",
            "- mode: choose Direct, Planned, or Deep.",
            "- skills: exact skill names definitely required to process the original request from its stated current state. Exclude weak associations, skills used only in already-completed stages, and skills that are only possible depending on an unapproved design.",
            "- requires_confirmation: whether explicit developer confirmation is required before writing.",
            "- uses_openspec: whether execution creates or depends on an active OpenSpec change or artifact.",
            "- alignment_required: whether this task category requires read-only SDD alignment, even if it is already approved.",
            "- change_contract_required: whether this task category requires a semantic Change Contract, even if it is already approved.",
            "- file_count_is_gate: whether predicted or actual file count is itself an authorization, routing, or re-confirmation gate.",
            "- implementation_may_start: whether implementation may start now, before any additional developer reply.",
            "- validation: the most important real validation entrypoints that the original task should run.",
            "- rationale: briefly explain the routing evidence."
        ) -join [Environment]::NewLine

        Remove-Item -LiteralPath $outputPath, $stdoutPath, $stderrPath -Force -ErrorAction SilentlyContinue
        [System.IO.File]::WriteAllText($promptPath, $prompt, $utf8NoBom)
        $args = @(
            "exec",
            "--ephemeral",
            "--sandbox", "read-only",
            "-m", $evalConfig.model,
            "-c", "model_reasoning_effort=`"$Reasoning`"",
            "-c", "mcp_servers.node_repl.enabled=false",
            "-c", "features.plugins=false",
            "-c", "features.remote_plugin=false",
            "-c", "features.apps=false",
            "-c", "features.browser_use=false",
            "-c", "features.code_mode_host=false",
            "--output-schema", $schemaPath,
            "--output-last-message", $outputPath,
            "--color", "never",
            "-C", $caseRoot,
            "-"
        )
        $processArgs = @($codexPrefixArgs) + $args
        try {
            $process = Start-Process -FilePath $codexExecutable -ArgumentList $processArgs `
                -RedirectStandardInput $promptPath -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath `
                -NoNewWindow -PassThru
            $finished = $process.WaitForExit($CaseTimeoutSeconds * 1000)
            if (-not $finished) {
                Stop-ProcessTree -RootProcessId $process.Id
                $results.Add([pscustomobject]@{ id = $item.id; status = "fail"; errors = @("codex exec timed out after $CaseTimeoutSeconds seconds"); answer = $null })
                Write-Output "[FAIL] $($item.id): codex exec timed out"
                continue
            }
            $process.WaitForExit()
            $exitCode = $process.ExitCode
            $stdoutOutput = @()
            $stderrOutput = @()
            if (Test-Path -LiteralPath $stdoutPath) { $stdoutOutput = @(Get-Content -LiteralPath $stdoutPath -Encoding UTF8) }
            if (Test-Path -LiteralPath $stderrPath) { $stderrOutput = @(Get-Content -LiteralPath $stderrPath -Encoding UTF8) }
            $cliOutput = @($stdoutOutput) + @($stderrOutput)
        } catch {
            $results.Add([pscustomobject]@{ id = $item.id; status = "fail"; errors = @("codex exec launch failed: $($_.Exception.Message)"); answer = $null })
            Write-Output "[FAIL] $($item.id): codex exec launch failed"
            continue
        }
        $answerJson = $null
        if (Test-Path -LiteralPath $outputPath) {
            $answerJson = Get-Content -LiteralPath $outputPath -Raw -Encoding UTF8
        } else {
            for ($lineIndex = $stdoutOutput.Count - 1; $lineIndex -ge 0; $lineIndex--) {
                $line = $stdoutOutput[$lineIndex]
                $candidate = $line.Trim()
                if (-not $candidate.StartsWith("{")) { continue }
                try {
                    $parsedCandidate = $candidate | ConvertFrom-Json
                    if ($parsedCandidate.PSObject.Properties.Name -contains "mode") {
                        $answerJson = $candidate
                        break
                    }
                } catch {
                }
            }
        }
        if (-not $answerJson) {
            $message = "exit=$exitCode; " + (($cliOutput | Out-String).Trim())
            $results.Add([pscustomobject]@{ id = $item.id; status = "fail"; errors = @("codex exec failed: $message"); answer = $null })
            Write-Output "[FAIL] $($item.id): codex exec failed"
            continue
        }

        try {
            $answer = $answerJson | ConvertFrom-Json
        } catch {
            $results.Add([pscustomobject]@{ id = $item.id; status = "fail"; errors = @("invalid JSON: $($_.Exception.Message)"); answer = $null })
            Write-Output "[FAIL] $($item.id): invalid JSON"
            continue
        }

        $errors = New-Object System.Collections.Generic.List[string]
        $expectedModes = @()
        if ($item.PSObject.Properties.Name -contains "expected_modes") {
            $expectedModes = @($item.expected_modes)
        } else {
            $expectedModes = @($item.expected_mode)
        }
        if ($expectedModes -notcontains $answer.mode) {
            $errors.Add("mode expected $($expectedModes -join '|'), got $($answer.mode)")
        }
        $actualSkills = @(
            @($answer.skills) |
                ForEach-Object { ([string]$_).Trim().ToLowerInvariant() } |
                Where-Object { $_ } |
                Sort-Object -Unique
        )
        $expectedSkills = @(
            @($item.expected_skills) |
                ForEach-Object { ([string]$_).Trim().ToLowerInvariant() } |
                Where-Object { $_ } |
                Sort-Object -Unique
        )
        $optionalSkills = @()
        if ($item.PSObject.Properties.Name -contains "optional_skills") {
            $optionalSkills = @(
                @($item.optional_skills) |
                    ForEach-Object { ([string]$_).Trim().ToLowerInvariant() } |
                    Where-Object { $_ } |
                    Sort-Object -Unique
            )
        }
        $allowedSkills = @($expectedSkills + $optionalSkills | Sort-Object -Unique)
        foreach ($skill in $expectedSkills) {
            if ($actualSkills -notcontains $skill) { $errors.Add("missing skill: $skill") }
        }
        foreach ($skill in $actualSkills) {
            if ($allowedSkills -notcontains $skill) { $errors.Add("unexpected skill: $skill") }
        }
        foreach ($skill in @($item.forbidden_skills)) {
            $normalized = ([string]$skill).Trim().ToLowerInvariant()
            if ($actualSkills -contains $normalized) { $errors.Add("forbidden skill: $normalized") }
        }
        if ([bool]$answer.requires_confirmation -ne [bool]$item.requires_confirmation) {
            $errors.Add("requires_confirmation expected $($item.requires_confirmation), got $($answer.requires_confirmation)")
        }
        if ([bool]$answer.uses_openspec) {
            $errors.Add("uses_openspec must be false in the native workflow")
        }
        if ([bool]$answer.alignment_required -ne [bool]$item.alignment_required) {
            $errors.Add("alignment_required expected $($item.alignment_required), got $($answer.alignment_required)")
        }
        if ([bool]$answer.change_contract_required -ne [bool]$item.change_contract_required) {
            $errors.Add("change_contract_required expected $($item.change_contract_required), got $($answer.change_contract_required)")
        }
        if ([bool]$answer.file_count_is_gate) {
            $errors.Add("file_count_is_gate must be false; semantic boundaries determine routing and confirmation")
        }
        if ([bool]$answer.implementation_may_start -ne [bool]$item.implementation_may_start) {
            $errors.Add("implementation_may_start expected $($item.implementation_may_start), got $($answer.implementation_may_start)")
        }
        $answerText = $answer | ConvertTo-Json -Depth 10 -Compress
        foreach ($term in @($item.required_terms)) {
            if ($answerText.IndexOf($term, [System.StringComparison]::OrdinalIgnoreCase) -lt 0) {
                $errors.Add("missing required term: $term")
            }
        }
        $validationText = @($answer.validation) -join [Environment]::NewLine
        $requiredValidationTerms = @()
        if ($item.PSObject.Properties.Name -contains "required_validation_terms") {
            $requiredValidationTerms = @(
                @($item.required_validation_terms) |
                    ForEach-Object { ([string]$_).Trim() } |
                    Where-Object { $_ }
            )
        }
        foreach ($term in $requiredValidationTerms) {
            if ($validationText.IndexOf($term, [System.StringComparison]::OrdinalIgnoreCase) -lt 0) {
                $errors.Add("validation missing required term: $term")
            }
        }

        $status = "pass"
        if ($errors.Count -gt 0) { $status = "fail" }
        $results.Add([pscustomobject]@{ id = $item.id; status = $status; errors = @($errors); answer = $answer })
        Write-Output "[$($status.ToUpperInvariant())] $($item.id)"
        foreach ($issue in $errors) { Write-Output "  - $issue" }
    }
} finally {
    Remove-Item -LiteralPath $schemaPath, $outputPath, $promptPath, $stdoutPath, $stderrPath -Force -ErrorAction SilentlyContinue
}

$summary = [pscustomobject]@{
    model = $evalConfig.model
    reasoning = $Reasoning
    suite = $(if ($Case.Count -gt 0) { "custom" } else { $Suite })
    total = $results.Count
    passed = @($results | Where-Object { $_.status -eq "pass" }).Count
    failed = @($results | Where-Object { $_.status -eq "fail" }).Count
    results = $results
}

$summary | ConvertTo-Json -Depth 12
if ($summary.failed -gt 0) { exit 1 }
