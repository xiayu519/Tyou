param(
    [Parameter(Mandatory = $true)]
    [string] $Change,
    [switch] $Json
)

$ErrorActionPreference = "Stop"

function New-Result {
    param(
        [string] $Name,
        [ValidateSet("pass", "warn", "fail")]
        [string] $Status,
        [string] $Message
    )
    [pscustomobject]@{
        name = $Name
        status = $Status
        message = $Message
    }
}

function Test-RelativePathExists {
    param([string] $Path)
    Test-Path -LiteralPath (Join-Path $PWD $Path)
}

$results = New-Object System.Collections.Generic.List[object]
$changeDir = Join-Path "openspec/changes" $Change

if (-not (Test-RelativePathExists $changeDir)) {
    $results.Add((New-Result "change-dir" "fail" "Missing change directory: $changeDir"))
} else {
    $results.Add((New-Result "change-dir" "pass" "Found $changeDir"))
}

$requiredArtifacts = @(
    "proposal.md",
    "design.md",
    "tasks.md"
)

foreach ($artifact in $requiredArtifacts) {
    $path = Join-Path $changeDir $artifact
    if (Test-RelativePathExists $path) {
        $results.Add((New-Result "artifact:$artifact" "pass" "Found $path"))
    } else {
        $results.Add((New-Result "artifact:$artifact" "fail" "Missing $path"))
    }
}

$specDir = Join-Path $changeDir "specs"
if (Test-RelativePathExists $specDir) {
    $specFiles = Get-ChildItem -LiteralPath $specDir -Recurse -Filter "spec.md" -ErrorAction SilentlyContinue
    if ($specFiles.Count -gt 0) {
        $results.Add((New-Result "artifact:specs" "pass" "Found $($specFiles.Count) delta spec file(s)"))
    } else {
        $results.Add((New-Result "artifact:specs" "warn" "Specs directory exists but no spec.md files were found"))
    }
} else {
    $results.Add((New-Result "artifact:specs" "warn" "No specs directory found under $changeDir"))
}

$tasksPath = Join-Path $changeDir "tasks.md"
if (Test-RelativePathExists $tasksPath) {
    $tasksText = Get-Content -LiteralPath $tasksPath -Raw -Encoding UTF8
    $todoCount = ([regex]::Matches($tasksText, "(?m)^- \[ \] ")).Count
    $doneCount = ([regex]::Matches($tasksText, "(?m)^- \[x\] ")).Count
    if (($todoCount + $doneCount) -eq 0) {
        $results.Add((New-Result "tasks-progress" "fail" "No parseable task checkboxes found"))
    } elseif ($todoCount -eq 0) {
        $results.Add((New-Result "tasks-progress" "pass" "$doneCount/$($doneCount + $todoCount) tasks complete"))
    } else {
        $results.Add((New-Result "tasks-progress" "warn" "$doneCount/$($doneCount + $todoCount) tasks complete; $todoCount remaining"))
    }
}

$runReportPath = Join-Path $changeDir "run-report.md"
if (Test-RelativePathExists $runReportPath) {
    $reportText = Get-Content -LiteralPath $runReportPath -Raw -Encoding UTF8
    $requiredHeadings = @(
        "## Executive Summary",
        "## Change",
        "## Decisions",
        "## Validation",
        "## Sensors",
        "## Risks",
        "## Correction Loop"
    )
    $missingHeadings = @()
    foreach ($heading in $requiredHeadings) {
        if ($reportText -notmatch [regex]::Escape($heading)) {
            $missingHeadings += $heading
        }
    }
    if ($missingHeadings.Count -eq 0) {
        $results.Add((New-Result "run-report" "pass" "run-report.md has the required sections"))
    } else {
        $results.Add((New-Result "run-report" "warn" "run-report.md is missing: $($missingHeadings -join ', ')"))
    }
} else {
    $results.Add((New-Result "run-report" "warn" "Missing $runReportPath; required for L3/L4 changes"))
}

try {
    $statusJson = cmd /c openspec.cmd status --change $Change --json 2>$null
    if ($LASTEXITCODE -eq 0 -and $statusJson) {
        $status = $statusJson | ConvertFrom-Json
        if ($status.applyRequires) {
            $results.Add((New-Result "openspec-status" "pass" "OpenSpec status loaded for schema $($status.schemaName)"))
        } else {
            $results.Add((New-Result "openspec-status" "warn" "OpenSpec status loaded but applyRequires was empty"))
        }
    } else {
        $results.Add((New-Result "openspec-status" "warn" "OpenSpec status command returned no JSON"))
    }
} catch {
    $results.Add((New-Result "openspec-status" "warn" "Could not load OpenSpec status: $($_.Exception.Message)"))
}

try {
    $gitChanged = git -c core.excludesfile= status --short
    $protectedPatterns = @(
        "Client/assets/ty-framework/",
        "Client/assets/**/*.prefab",
        "Client/assets/**/*.scene",
        "Client/assets/**/*.meta",
        "Design/config/"
    )
    $protectedHits = @()
    foreach ($line in $gitChanged) {
        foreach ($pattern in $protectedPatterns) {
            $regex = "^.. " + (($pattern -replace "\*\*", ".*") -replace "\*", "[^/]*" -replace "/", "[\\/]")
            if ($line -match $regex) {
                $protectedHits += $line.Trim()
            }
        }
    }
    if ($protectedHits.Count -eq 0) {
        $results.Add((New-Result "protected-paths" "pass" "No protected path changes detected in git status"))
    } else {
        $results.Add((New-Result "protected-paths" "warn" "Protected path changes detected: $($protectedHits -join '; ')"))
    }
} catch {
    $results.Add((New-Result "protected-paths" "warn" "Could not inspect git status: $($_.Exception.Message)"))
}

$summary = [pscustomobject]@{
    change = $Change
    generatedAt = (Get-Date).ToString("s")
    results = $results
    totals = [pscustomobject]@{
        pass = @($results | Where-Object { $_.status -eq "pass" }).Count
        warn = @($results | Where-Object { $_.status -eq "warn" }).Count
        fail = @($results | Where-Object { $_.status -eq "fail" }).Count
    }
}

if ($Json) {
    $summary | ConvertTo-Json -Depth 6
} else {
    "Codex observability check: $Change"
    foreach ($result in $results) {
        $label = $result.status.ToUpperInvariant()
        "[$label] $($result.name): $($result.message)"
    }
    "Summary: pass=$($summary.totals.pass) warn=$($summary.totals.warn) fail=$($summary.totals.fail)"
}

if ($summary.totals.fail -gt 0) {
    exit 1
}
