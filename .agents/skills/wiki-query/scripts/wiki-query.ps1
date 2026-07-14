param(
    [Parameter(Mandatory = $true)]
    [string] $Query,
    [string] $Config = "wiki-sync.yaml",
    [int] $Limit = 20
)

$ErrorActionPreference = "Stop"

function Get-RepoRoot {
    $path = Resolve-Path "."
    while ($path) {
        if (Test-Path -LiteralPath (Join-Path $path ".git")) { return $path.Path }
        $parent = Split-Path $path -Parent
        if (-not $parent -or $parent -eq $path) { break }
        $path = Resolve-Path $parent
    }
    return (Resolve-Path ".").Path
}

function Get-WikiIncludes {
    param([string] $Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        return @("README.md", "Books/**/*.md", ".agents/skills/**/references/**/*.md", ".codex/memory/**/*.md", ".agents/skills/**/SKILL.md", "AGENTS.md", "**/AGENTS.override.md")
    }
    $patterns = @()
    $inInclude = $false
    foreach ($raw in Get-Content -LiteralPath $Path -Encoding UTF8) {
        $trim = $raw.Trim()
        if ($trim -match "^wiki_include:") { $inInclude = $true; continue }
        if ($inInclude -and $trim -match "^[A-Za-z_]+:") { break }
        if ($inInclude -and $trim -match "^- `"?([^`"]+)`"?") { $patterns += $Matches[1] }
    }
    if ($patterns.Count -eq 0) {
        $patterns = @("README.md", "Books/**/*.md", ".agents/skills/**/references/**/*.md", ".codex/memory/**/*.md", ".agents/skills/**/SKILL.md", "AGENTS.md", "**/AGENTS.override.md")
    }
    return $patterns
}

$root = Get-RepoRoot
Set-Location $root
$patterns = Get-WikiIncludes $Config
$files = @()
$allFiles = Get-ChildItem -LiteralPath $root -File -Recurse -Force -ErrorAction SilentlyContinue
foreach ($file in $allFiles) {
    $fullRoot = (Resolve-Path -LiteralPath $root).Path.TrimEnd("\", "/")
    $fullPath = (Resolve-Path -LiteralPath $file.FullName).Path
    if ($fullPath.StartsWith($fullRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        $rel = $fullPath.Substring($fullRoot.Length).TrimStart("\", "/").Replace("\", "/")
    } else {
        $rel = $fullPath.Replace("\", "/")
    }
    foreach ($pattern in $patterns) {
        $regex = [regex]::Escape($pattern)
        $regex = $regex.Replace("\*\*/", "(.*/)?").Replace("\*\*", ".*").Replace("\*", "[^/]*")
        if ($rel -match "^$regex$") {
            $files += $file
            break
        }
    }
}
$files = $files | Sort-Object FullName -Unique

Write-Output "[WIKI-QUERY] $Query"
Write-Output ("Docs scanned: {0}" -f $files.Count)

$matches = foreach ($file in $files) {
    Select-String -LiteralPath $file.FullName -Pattern $Query -SimpleMatch -ErrorAction SilentlyContinue
}

$matches |
    Select-Object -First $Limit |
    ForEach-Object {
        $fullRoot = (Resolve-Path -LiteralPath $root).Path.TrimEnd("\", "/")
        $fullPath = (Resolve-Path -LiteralPath $_.Path).Path
        if ($fullPath.StartsWith($fullRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
            $rel = $fullPath.Substring($fullRoot.Length).TrimStart("\", "/").Replace("\", "/")
        } else {
            $rel = $fullPath.Replace("\", "/")
        }
        "{0}:{1}: {2}" -f $rel, $_.LineNumber, $_.Line.Trim()
    }

if (-not $matches) {
    Write-Output "No matches."
}
