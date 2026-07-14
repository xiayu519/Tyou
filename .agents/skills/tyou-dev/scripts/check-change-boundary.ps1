param(
    [Parameter(Mandatory = $true)]
    [string[]] $Files,
    [string[]] $GeneratedFiles = @(),
    [string[]] $AllowedRoots = @(),
    [switch] $Json
)

$ErrorActionPreference = "Stop"
$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "../../../.."))
$root = (Resolve-Path -LiteralPath $root).Path
$errors = New-Object System.Collections.Generic.List[string]

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
    $prefix = $root.TrimEnd("\", "/") + [System.IO.Path]::DirectorySeparatorChar
    if (-not $full.Equals($root, [System.StringComparison]::OrdinalIgnoreCase) -and
        -not $full.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "path is outside repository: $Path"
    }
    return $full.Substring($root.Length).TrimStart("\", "/").Replace("\", "/")
}

$normalizedFiles = New-Object System.Collections.Generic.List[string]
foreach ($file in (Expand-List $Files)) {
    try {
        $relative = Get-RelativePath $file
        if (-not $relative) {
            $errors.Add("file must not be the repository root: $file")
        } elseif (-not $normalizedFiles.Contains($relative)) {
            $normalizedFiles.Add($relative)
        }
    } catch {
        $errors.Add($_.Exception.Message)
    }
}

$generatedSet = @{}
foreach ($file in (Expand-List $GeneratedFiles)) {
    try {
        $relative = Get-RelativePath $file
        $generatedSet[$relative.ToLowerInvariant()] = $true
        if (-not $normalizedFiles.Contains($relative)) {
            $errors.Add("generated file is not present in -Files: $relative")
        }
    } catch {
        $errors.Add($_.Exception.Message)
    }
}

$normalizedRoots = New-Object System.Collections.Generic.List[string]
foreach ($allowed in (Expand-List $AllowedRoots)) {
    try {
        $relative = (Get-RelativePath $allowed).TrimEnd("/")
        if (-not $normalizedRoots.Contains($relative)) { $normalizedRoots.Add($relative) }
    } catch {
        $errors.Add($_.Exception.Message)
    }
}

if ($normalizedRoots.Count -gt 0) {
    foreach ($file in $normalizedFiles) {
        $allowed = $false
        foreach ($allowedRoot in $normalizedRoots) {
            if (-not $allowedRoot -or
                $file.Equals($allowedRoot, [System.StringComparison]::OrdinalIgnoreCase) -or
                $file.StartsWith($allowedRoot + "/", [System.StringComparison]::OrdinalIgnoreCase)) {
                $allowed = $true
                break
            }
        }
        if (-not $allowed) { $errors.Add("file is outside declared roots: $file") }
    }
}

$generated = @($normalizedFiles | Where-Object { $generatedSet.ContainsKey($_.ToLowerInvariant()) })
$source = @($normalizedFiles | Where-Object { -not $generatedSet.ContainsKey($_.ToLowerInvariant()) })
$summary = [pscustomobject]@{
    actualFiles = $normalizedFiles.Count
    actualSourceFiles = $source.Count
    actualGeneratedFiles = $generated.Count
    allowedRoots = @($normalizedRoots)
    sourceFiles = $source
    generatedFiles = $generated
    errors = @($errors)
}

if ($Json) {
    $summary | ConvertTo-Json -Depth 6
} else {
    "Change boundary check"
    "Files: total=$($normalizedFiles.Count) source=$($source.Count) generated=$($generated.Count) (review information only)"
    if ($normalizedRoots.Count -gt 0) { "Declared roots: $($normalizedRoots -join ', ')" }
    foreach ($issue in $errors) { "[FAIL] $issue" }
    if ($errors.Count -eq 0) { "[PASS] Files are within the declared path boundary; semantic review is still required" }
}

if ($errors.Count -gt 0) { exit 1 }
