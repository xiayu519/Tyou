param(
    [string] $Root = "",
    [switch] $Json
)

$ErrorActionPreference = "Stop"
if (-not $Root) {
    $Root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "../../../.."))
}
$Root = (Resolve-Path -LiteralPath $Root).Path
$knowledgeRoot = Join-Path $Root ".codex/memory"
$indexPath = Join-Path $knowledgeRoot "INDEX.md"
$errors = New-Object System.Collections.Generic.List[string]

if (-not (Test-Path -LiteralPath $indexPath -PathType Leaf)) {
    $errors.Add("missing Project Knowledge index: .codex/memory/INDEX.md")
    $indexText = ""
} else {
    $indexText = Get-Content -LiteralPath $indexPath -Raw -Encoding UTF8
    foreach ($marker in @("Tyou Project Knowledge", "Codex Memories")) {
        if ($indexText.IndexOf($marker, [System.StringComparison]::Ordinal) -lt 0) {
            $errors.Add("INDEX.md missing identity marker: $marker")
        }
    }
}

$allowedTypes = @("problem", "decision", "feedback", "reference")
$allowedStatus = @("active", "stale", "superseded")
$allowedSources = @("user-confirmed", "codex-observed", "reference-material")
$entries = @()
if (Test-Path -LiteralPath $knowledgeRoot -PathType Container) {
    $entries = @(
        Get-ChildItem -LiteralPath $knowledgeRoot -Recurse -Filter "*.md" -File |
            Where-Object { $_.FullName -ne $indexPath } |
            Sort-Object FullName
    )
}

foreach ($file in $entries) {
    $relative = $file.FullName.Substring($knowledgeRoot.Length + 1).Replace("\", "/")
    $text = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8
    $frontmatter = [regex]::Match($text, "(?s)\A---\r?\n(.*?)\r?\n---")
    if (-not $frontmatter.Success) {
        $errors.Add("missing frontmatter: $relative")
        continue
    }
    $values = @{}
    foreach ($field in @("type", "description", "status", "last_verified", "source")) {
        $match = [regex]::Match($frontmatter.Groups[1].Value, "(?m)^${field}:\s*([^\r\n]+)$")
        if (-not $match.Success) {
            $errors.Add("missing ${field}: $relative")
        } else {
            $values[$field] = $match.Groups[1].Value.Trim()
        }
    }
    if ($values.type -and $values.type -notin $allowedTypes) { $errors.Add("invalid type '$($values.type)': $relative") }
    if ($values.status -and $values.status -notin $allowedStatus) { $errors.Add("invalid status '$($values.status)': $relative") }
    if ($values.source -and $values.source -notin $allowedSources) { $errors.Add("invalid source '$($values.source)': $relative") }
    if ($values.last_verified -and $values.last_verified -notmatch "^\d{4}-\d{2}-\d{2}$") { $errors.Add("invalid last_verified '$($values.last_verified)': $relative") }

    $directoryType = Split-Path (Split-Path $relative -Parent) -Leaf
    if ($directoryType.EndsWith("s")) { $directoryType = $directoryType.Substring(0, $directoryType.Length - 1) }
    if ($values.type -and $directoryType -and $values.type -ne $directoryType) {
        $errors.Add("type/path mismatch '$($values.type)' vs '$directoryType': $relative")
    }
    if ($indexText -and $indexText.IndexOf("]($relative)", [System.StringComparison]::Ordinal) -lt 0) {
        $errors.Add("entry missing from INDEX.md: $relative")
    }
}

if ($indexText) {
    $links = [regex]::Matches($indexText, "\]\(([^)]+\.md)\)")
    foreach ($link in $links) {
        $relative = $link.Groups[1].Value.Replace("\", "/")
        $target = Join-Path $knowledgeRoot $relative
        if (-not (Test-Path -LiteralPath $target -PathType Leaf)) {
            $errors.Add("INDEX.md target missing: $relative")
        }
    }
}

$summary = [pscustomobject]@{
    entries = $entries.Count
    errors = @($errors)
}

if ($Json) {
    $summary | ConvertTo-Json -Depth 5
} else {
    "Project Knowledge check"
    "Entries: $($entries.Count)"
    foreach ($issue in $errors) { "[FAIL] $issue" }
    if ($errors.Count -eq 0) { "[PASS] Project Knowledge identity, frontmatter, paths, and index are valid" }
}

if ($errors.Count -gt 0) { exit 1 }
