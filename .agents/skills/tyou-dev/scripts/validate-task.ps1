param(
    [Parameter(Mandatory = $true)]
    [string[]] $Files,
    [string[]] $GeneratedFiles = @(),
    [string[]] $AllowedRoots = @()
)

$ErrorActionPreference = "Stop"
$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "../../../.."))
$root = (Resolve-Path -LiteralPath $root).Path
$failures = New-Object System.Collections.Generic.List[string]

function Invoke-Validation {
    param(
        [string] $Name,
        [scriptblock] $Action
    )
    Write-Output "[RUN] $Name"
    try {
        & $Action
        if ($LASTEXITCODE -ne 0) {
            throw "exit code $LASTEXITCODE"
        }
        Write-Output "[PASS] $Name"
    } catch {
        $failures.Add("${Name}: $($_.Exception.Message)")
        Write-Output "[FAIL] ${Name}: $($_.Exception.Message)"
    }
}

function Expand-List {
    param([string[]] $Values)
    $items = New-Object System.Collections.Generic.List[string]
    foreach ($value in $Values) {
        foreach ($part in ($value -split ",")) {
            $trimmed = $part.Trim()
            if ($trimmed -and -not $items.Contains($trimmed)) { $items.Add($trimmed) }
        }
    }
    return @($items)
}

function Get-RelativePath {
    param([string] $Path)
    $candidate = $Path
    if (-not [System.IO.Path]::IsPathRooted($candidate)) {
        $candidate = Join-Path $root $candidate
    }
    $full = [System.IO.Path]::GetFullPath($candidate)
    if (-not $full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "file is outside repository: $Path"
    }
    return $full.Substring($root.Length).TrimStart("\", "/").Replace("\", "/")
}

Set-Location $root
$relativeFiles = New-Object System.Collections.Generic.List[string]
foreach ($file in (Expand-List $Files)) {
    try {
        $relative = Get-RelativePath $file
        $full = Join-Path $root $relative
        if (-not (Test-Path -LiteralPath $full -PathType Leaf)) {
            throw "file not found: $relative"
        }
        if (-not $relativeFiles.Contains($relative)) { $relativeFiles.Add($relative) }
    } catch {
        $failures.Add($_.Exception.Message)
    }
}

if ($relativeFiles.Count -eq 0) {
    Write-Output "No valid files were supplied."
    exit 1
}

if ($GeneratedFiles.Count -gt 0 -or $AllowedRoots.Count -gt 0) {
    $boundaryScript = Join-Path $root ".agents/skills/tyou-dev/scripts/check-change-boundary.ps1"
    Invoke-Validation "Declared change path boundary" {
        $boundaryArgs = @(
            "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $boundaryScript,
            "-Files", (@($relativeFiles) -join ",")
        )
        if ($GeneratedFiles.Count -gt 0) {
            $boundaryArgs += @("-GeneratedFiles", ($GeneratedFiles -join ","))
        }
        if ($AllowedRoots.Count -gt 0) {
            $boundaryArgs += @("-AllowedRoots", ($AllowedRoots -join ","))
        }
        & powershell @boundaryArgs
    }
}

$runtimeTs = @($relativeFiles | Where-Object { $_ -match "^Client/assets/.+\.ts$" })
if ($runtimeTs.Count -gt 0) {
    $checker = Join-Path $root ".agents/skills/tyou-dev/scripts/check-cocos-iterable-spread.mjs"
    Invoke-Validation "Cocos iterable spread" {
        $args = @($checker) + $runtimeTs
        & node @args
    }
}

$skillDirs = @(
    $relativeFiles |
        Where-Object { $_ -match "^\.agents/skills/[^/]+/SKILL\.md$" } |
        ForEach-Object { Split-Path (Join-Path $root $_) -Parent } |
        Sort-Object -Unique
)
if ($skillDirs.Count -gt 0) {
    $codexHome = $env:CODEX_HOME
    if (-not $codexHome) { $codexHome = Join-Path $HOME ".codex" }
    $quickValidate = Join-Path $codexHome "skills/.system/skill-creator/scripts/quick_validate.py"
    foreach ($skillDir in $skillDirs) {
        $skillName = Split-Path $skillDir -Leaf
        Invoke-Validation "Skill quick validation: $skillName" {
            $previous = $env:PYTHONUTF8
            $env:PYTHONUTF8 = "1"
            try { & python $quickValidate $skillDir } finally { $env:PYTHONUTF8 = $previous }
        }
    }
}

$workflowPatterns = @(
    "^AGENTS\.md$",
    "/AGENTS\.override\.md$",
    "^\.codex/config\.toml$",
    "^\.agents/skills/",
    "^\.codex/memory/",
    "^Books/AI-Development-Workflow\.md$",
    "^README\.md$",
    "^wiki-sync\.yaml$"
)
$needsWorkflowCheck = $false
foreach ($file in $relativeFiles) {
    foreach ($pattern in $workflowPatterns) {
        if ($file -match $pattern) { $needsWorkflowCheck = $true; break }
    }
    if ($needsWorkflowCheck) { break }
}
if ($needsWorkflowCheck) {
    Invoke-Validation "Codex workflow" {
        & powershell -NoProfile -ExecutionPolicy Bypass -File ".agents/skills/tyou-dev/scripts/check-codex-workflow.ps1" -Root $root
    }
}

$boundaryTestInputs = @(
    ".agents/skills/tyou-dev/scripts/check-change-boundary.ps1",
    ".agents/skills/tyou-dev/tests/check-change-boundary.test.ps1"
)
if (@($relativeFiles | Where-Object { $_ -in $boundaryTestInputs }).Count -gt 0) {
    Invoke-Validation "Change boundary checker tests" {
        & powershell -NoProfile -ExecutionPolicy Bypass -File ".agents/skills/tyou-dev/tests/check-change-boundary.test.ps1"
    }
}

$wikiPatterns = @(
    "^AGENTS\.md$",
    "/AGENTS\.override\.md$",
    "^\.codex/config\.toml$",
    "^README\.md$",
    "^Books/",
    "^\.agents/skills/.+/(SKILL\.md|references/.+\.md)$",
    "^\.codex/memory/.+\.md$",
    "^wiki-sync\.yaml$"
)
$needsWiki = $false
foreach ($file in $relativeFiles) {
    foreach ($pattern in $wikiPatterns) {
        if ($file -match $pattern) { $needsWiki = $true; break }
    }
    if ($needsWiki) { break }
}
if ($needsWiki) {
    $wikiScript = ".agents/skills/wiki-sync/scripts/wiki-sync.ps1"
    Invoke-Validation "Wiki scan" {
        & powershell -NoProfile -ExecutionPolicy Bypass -File $wikiScript scan
    }
    Invoke-Validation "Wiki diff" {
        & powershell -NoProfile -ExecutionPolicy Bypass -File $wikiScript diff
    }
}

$extensions = @(
    $relativeFiles |
        ForEach-Object { if ($_ -match "^Client/extensions/([^/]+)/") { $Matches[1] } } |
        Where-Object { $_ } |
        Sort-Object -Unique
)
foreach ($extension in $extensions) {
    $extensionDir = Join-Path $root "Client/extensions/$extension"
    $packagePath = Join-Path $extensionDir "package.json"
    if (-not (Test-Path -LiteralPath $packagePath)) {
        $failures.Add("Creator extension package not found: Client/extensions/$extension/package.json")
        continue
    }
    $package = Get-Content -LiteralPath $packagePath -Raw -Encoding UTF8 | ConvertFrom-Json
    $scriptNames = @($package.scripts.PSObject.Properties.Name)
    if ($scriptNames -contains "test") {
        Invoke-Validation "Creator extension test: $extension" {
            Push-Location $extensionDir
            try { & npm test } finally { Pop-Location }
        }
    } elseif ($scriptNames -contains "build") {
        Invoke-Validation "Creator extension build: $extension" {
            Push-Location $extensionDir
            try { & npm run build } finally { Pop-Location }
        }
    } else {
        $failures.Add("Creator extension has no build/test script: $extension")
    }
}

$textExtensions = @(".md", ".ts", ".js", ".mjs", ".py", ".json", ".yaml", ".yml", ".ps1")
foreach ($relative in $relativeFiles) {
    $full = Join-Path $root $relative
    if ([System.IO.Path]::GetExtension($full).ToLowerInvariant() -notin $textExtensions) { continue }
    $lineNumber = 0
    foreach ($line in Get-Content -LiteralPath $full -Encoding UTF8) {
        $lineNumber++
        if ($line -match "[ \t]+$") {
            $failures.Add("Trailing whitespace: $relative`:$lineNumber")
        }
    }
}

Invoke-Validation "Git diff check for supplied files" {
    $args = @("diff", "--check", "--") + @($relativeFiles)
    & git @args
}

if ($failures.Count -gt 0) {
    Write-Output "Validation failed:"
    $failures | ForEach-Object { Write-Output "- $_" }
    exit 1
}

Write-Output "Validation passed for $($relativeFiles.Count) file(s)."
