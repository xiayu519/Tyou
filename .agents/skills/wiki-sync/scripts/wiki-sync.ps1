param(
    [ValidateSet("scan", "diff", "sync", "report")]
    [string] $Command = "scan",
    [string] $Target = "",
    [ValidateSet("A", "B", "both")]
    [string] $Dir = "both",
    [string] $Config = "wiki-sync.yaml",
    [string] $Output = "",
    [switch] $Write
)

$ErrorActionPreference = "Stop"

function Get-RepoRoot {
    $path = Resolve-Path "."
    while ($path) {
        if (Test-Path -LiteralPath (Join-Path $path ".git")) {
            return $path.Path
        }
        $parent = Split-Path $path -Parent
        if (-not $parent -or $parent -eq $path) { break }
        $path = Resolve-Path $parent
    }
    return (Resolve-Path ".").Path
}

function Read-WikiConfig {
    param([string] $Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "wiki sync config not found: $Path"
    }

    $config = [ordered]@{
        source_paths = @()
        wiki_include = @()
        mappings = @()
        source_ignore = @()
        wiki_ignore = @()
        write_enabled = $false
        conflict_strategy = "ask"
        backup_enabled = $true
        backup_directory = ".wiki-sync-backups"
        report_output = "wiki-sync-report.md"
        sensitive_patterns = @(
            [ordered]@{
                pattern = "(api[_-]?key|secret|password|token|pwd)\s*[:=]\s*\S+"
                replacement = "<REDACTED>"
            }
        )
    }

    $section = ""
    $currentMap = $null
    $ignoreKind = ""
    foreach ($raw in Get-Content -LiteralPath $Path -Encoding UTF8) {
        $line = $raw.TrimEnd()
        $trim = $line.Trim()
        if ($trim -eq "" -or $trim.StartsWith("#")) { continue }

        if ($trim -match "^write_enabled:\s*(true|false)") {
            $config.write_enabled = $Matches[1] -eq "true"
            continue
        }
        if ($trim -match "^conflict_strategy:\s*(\S+)") {
            $config.conflict_strategy = $Matches[1]
            continue
        }
        if ($trim -match "^directory:\s*`"([^`"]+)`"") {
            $config.backup_directory = $Matches[1]
            continue
        }
        if ($trim -match "^default_output:\s*`"([^`"]+)`"") {
            $config.report_output = $Matches[1]
            continue
        }
        if ($trim -match "^source_paths:") { $section = "source_paths"; continue }
        if ($trim -match "^wiki_include:") { $section = "wiki_include"; continue }
        if ($trim -match "^mappings:") { $section = "mappings"; continue }
        if ($trim -match "^ignore:") { $section = "ignore"; continue }
        if ($section -eq "ignore" -and $trim -match "^source:") { $ignoreKind = "source"; continue }
        if ($section -eq "ignore" -and $trim -match "^wiki:") { $ignoreKind = "wiki"; continue }
        if ($trim -match "^- path:\s*`"([^`"]+)`"") {
            $config.source_paths += [ordered]@{ path = $Matches[1]; label = $Matches[1] }
            continue
        }
        if ($trim -match "^label:\s*`"([^`"]+)`"" -and $config.source_paths.Count -gt 0) {
            $config.source_paths[$config.source_paths.Count - 1].label = $Matches[1]
            continue
        }
        if ($section -eq "wiki_include" -and $trim -match "^- `"?([^`"]+)`"?") {
            $config.wiki_include += $Matches[1]
            continue
        }
        if ($section -eq "ignore" -and $trim -match "^\[(.*)\]") {
            $items = $Matches[1].Split(",") | ForEach-Object { $_.Trim().Trim('"') } | Where-Object { $_ }
            if ($ignoreKind -eq "source") { $config.source_ignore += $items }
            if ($ignoreKind -eq "wiki") { $config.wiki_ignore += $items }
            continue
        }
        if ($section -eq "mappings" -and $trim -match "^- source_pattern:\s*`"([^`"]+)`"") {
            $currentMap = [ordered]@{ source_pattern = $Matches[1]; wiki_path = "" }
            $config.mappings += $currentMap
            continue
        }
        if ($section -eq "mappings" -and $trim -match "^wiki_path:\s*`"([^`"]+)`"" -and $currentMap) {
            $currentMap.wiki_path = $Matches[1]
            continue
        }
    }

    return $config
}

function Redact-Text {
    param([string] $Text, $Cfg)
    $result = $Text
    foreach ($item in $Cfg.sensitive_patterns) {
        $result = [regex]::Replace($result, $item.pattern, $item.replacement, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    }
    return $result
}

function Write-GuardedFile {
    param([string] $Path, [string] $Text, $Cfg)
    $safeText = Redact-Text $Text $Cfg
    if ($Cfg.backup_enabled -and (Test-Path -LiteralPath $Path)) {
        $backupDir = Join-Path (Get-RepoRoot) $Cfg.backup_directory
        if (-not (Test-Path -LiteralPath $backupDir)) {
            New-Item -ItemType Directory -Path $backupDir | Out-Null
        }
        $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
        $name = Split-Path $Path -Leaf
        Copy-Item -LiteralPath $Path -Destination (Join-Path $backupDir "$stamp-$name") -Force
    }
    Set-Content -LiteralPath $Path -Value $safeText -Encoding UTF8
}

function Test-Ignored {
    param([string] $RelativePath, [array] $Patterns)
    $normalized = $RelativePath -replace "\\", "/"
    foreach ($pattern in $Patterns) {
        $regex = [regex]::Escape($pattern).Replace("\*\*", ".*").Replace("\*", "[^/]*")
        if ($normalized -match "^$regex$") { return $true }
    }
    return $false
}

function Test-GlobMatch {
    param([string] $RelativePath, [string] $Pattern)
    $normalized = $RelativePath -replace "\\", "/"
    $regex = [regex]::Escape($Pattern)
    $regex = $regex.Replace("\*\*/", "(.*/)?").Replace("\*\*", ".*").Replace("\*", "[^/]*")
    return $normalized -match "^$regex$"
}

function Get-RelativePath {
    param([string] $Root, [string] $Path)
    $fullRoot = (Resolve-Path -LiteralPath $Root).Path.TrimEnd("\", "/")
    $fullPath = (Resolve-Path -LiteralPath $Path).Path
    if ($fullPath.StartsWith($fullRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $fullPath.Substring($fullRoot.Length).TrimStart("\", "/").Replace("\", "/")
    }
    return $fullPath.Replace("\", "/")
}

function Get-SourceFiles {
    param($Root, $Cfg)
    $files = @()
    foreach ($entry in $Cfg.source_paths) {
        $full = Join-Path $Root $entry.path
        if (-not (Test-Path -LiteralPath $full)) { continue }
        $files += Get-ChildItem -LiteralPath $full -Recurse -File -Force |
            Where-Object { -not (Test-Ignored (Get-RelativePath $Root $_.FullName) $Cfg.source_ignore) } |
            ForEach-Object { Get-RelativePath $Root $_.FullName }
    }
    return $files | Sort-Object -Unique
}

function Get-WikiFiles {
    param($Root, $Cfg)
    $files = @()
    $all = Get-ChildItem -LiteralPath $Root -Recurse -File -Force -ErrorAction SilentlyContinue
    foreach ($file in $all) {
        $rel = Get-RelativePath $Root $file.FullName
        if (Test-Ignored $rel $Cfg.wiki_ignore) { continue }
        foreach ($pattern in $Cfg.wiki_include) {
            if (Test-GlobMatch $rel $pattern) {
                $files += $rel
                break
            }
        }
    }
    return $files | Sort-Object -Unique
}

function Get-Coverage {
    param($SourceFiles, $WikiFiles, $Mappings)
    $rows = @()
    foreach ($map in $Mappings) {
        $sourceRegex = [regex]::Escape($map.source_pattern).Replace("\*\*", ".*").Replace("\*", "[^/]*")
        $matchedSources = @($SourceFiles | Where-Object { $_ -match "^$sourceRegex$" })
        $wiki = @($WikiFiles | Where-Object { $_ -eq $map.wiki_path -or $_.StartsWith($map.wiki_path.TrimEnd("/") + "/") })
        $rows += [ordered]@{
            source_pattern = $map.source_pattern
            wiki_path = $map.wiki_path
            source_count = $matchedSources.Count
            wiki_count = $wiki.Count
            status = if ($matchedSources.Count -gt 0 -and $wiki.Count -gt 0) { "covered" } else { "gap" }
        }
    }
    return $rows
}

function Format-Report {
    param($Root, $Cfg, $SourceFiles, $WikiFiles, $Coverage)
    $lines = @()
    $lines += "# Wiki Sync Report"
    $lines += ""
    $lines += "- Root: $Root"
    $lines += "- Sources: $($SourceFiles.Count)"
    $lines += "- Wiki docs: $($WikiFiles.Count)"
    $lines += "- Write enabled: $($Cfg.write_enabled)"
    $lines += "- Conflict strategy: $($Cfg.conflict_strategy)"
    $lines += ""
    $lines += "## Coverage"
    foreach ($row in $Coverage) {
        $lines += "- [$($row.status)] $($row.source_pattern) -> $($row.wiki_path) (source $($row.source_count), wiki $($row.wiki_count))"
    }
    return $lines -join [Environment]::NewLine
}

$root = Get-RepoRoot
Set-Location $root
$cfg = Read-WikiConfig $Config
$sourceFiles = Get-SourceFiles $root $cfg
$wikiFiles = Get-WikiFiles $root $cfg
$coverage = Get-Coverage $sourceFiles $wikiFiles $cfg.mappings

if ($Target) {
    $sourceFiles = @($sourceFiles | Where-Object { $_ -match [regex]::Escape($Target) })
    $wikiFiles = @($wikiFiles | Where-Object { $_ -match [regex]::Escape($Target) })
}

switch ($Command) {
    "scan" {
        Write-Output "[SCAN] Wiki sync"
        Write-Output ("Config: {0}" -f $Config)
        Write-Output ("Sources: {0}" -f $sourceFiles.Count)
        Write-Output ("Wiki docs: {0}" -f $wikiFiles.Count)
        foreach ($row in $coverage) {
            Write-Output ("[{0}] {1} -> {2} (source {3}, wiki {4})" -f $row.status, $row.source_pattern, $row.wiki_path, $row.source_count, $row.wiki_count)
        }
    }
    "diff" {
        Write-Output "[DIFF] Wiki sync"
        foreach ($row in $coverage | Where-Object { $_.status -eq "gap" }) {
            Write-Output ("[gap] {0} -> {1}" -f $row.source_pattern, $row.wiki_path)
        }
        if (($coverage | Where-Object { $_.status -eq "gap" }).Count -eq 0) {
            Write-Output "No mapping gaps detected."
        }
    }
    "report" {
        $text = Format-Report $root $cfg $sourceFiles $wikiFiles $coverage
        if ($Output) {
            if (-not $Write -and -not $cfg.write_enabled) {
                throw "report output is a write operation; set write_enabled: true or pass -Write"
            }
            Write-GuardedFile $Output $text $cfg
            Write-Output ("Report written: {0}" -f $Output)
        } else {
            Write-Output $text
        }
    }
    "sync" {
        if (-not $Write -and -not $cfg.write_enabled) {
            throw "sync refused: write_enabled is false and -Write was not passed"
        }
        if ($Dir -eq "A") {
            throw "sync --dir A is intentionally not automated yet; use report output and apply docs through OpenSpec"
        }
        if ($Dir -eq "B" -or $Dir -eq "both") {
            $todo = if ($Output) { $Output } else { "WIKI_SYNC_TODO.md" }
            $text = Format-Report $root $cfg $sourceFiles $wikiFiles $coverage
            Write-GuardedFile $todo $text $cfg
            Write-Output ("Todo written: {0}" -f $todo)
        }
    }
}
