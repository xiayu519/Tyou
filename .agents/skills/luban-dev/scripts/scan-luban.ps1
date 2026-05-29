$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")
Set-Location $root

function Test-ItemState {
    param(
        [string] $Label,
        [string] $Path
    )

    $exists = Test-Path -LiteralPath $Path
    $state = if ($exists) { "OK" } else { "MISSING" }
    "{0,-18} {1,-8} {2}" -f $Label, $state, $Path
}

Write-Output "Tyou Luban scan"
Write-Output ("Root: {0}" -f $root)
Write-Output ""

Test-ItemState "config dir" "Design\config"
Test-ItemState "tables" "Design\config\__tables__.xlsx"
Test-ItemState "beans" "Design\config\__beans__.xlsx"
Test-ItemState "enums" "Design\config\__enums__.xlsx"
Test-ItemState "builtin" "Design\tools\Defines\builtin.xml"
Test-ItemState "luban conf" "Design\tools\luban.conf"
Test-ItemState "gen script" "Design\tools\genBin.bat"
Test-ItemState "bin output" "Client\assets\asset-raw\config\game"
Test-ItemState "schema" "Client\assets\scripts\proto\config\bin\schema.ts"
Test-ItemState "TableModule" "Client\assets\ty-framework\module\table\TableModule.ts"

Write-Output ""

$sourceTables = @(Get-ChildItem -LiteralPath "Design\config" -Filter "*.xlsx" -File -ErrorAction SilentlyContinue)
$binFiles = @(Get-ChildItem -LiteralPath "Client\assets\asset-raw\config\game" -Filter "*.bin" -File -ErrorAction SilentlyContinue)
$binMetas = @(Get-ChildItem -LiteralPath "Client\assets\asset-raw\config\game" -Filter "*.bin.meta" -File -ErrorAction SilentlyContinue)

Write-Output ("xlsx count: {0}" -f $sourceTables.Count)
Write-Output ("bin count:  {0}" -f $binFiles.Count)
Write-Output ("meta count: {0}" -f $binMetas.Count)

$binNames = @{}
foreach ($bin in $binFiles) {
    $binNames[$bin.Name.ToLowerInvariant()] = $true
}

$orphanMetas = @()
foreach ($meta in $binMetas) {
    $targetName = $meta.Name.Substring(0, $meta.Name.Length - ".meta".Length).ToLowerInvariant()
    if (-not $binNames.ContainsKey($targetName)) {
        $orphanMetas += $meta.Name
    }
}

$metaNames = @{}
foreach ($meta in $binMetas) {
    $targetName = $meta.Name.Substring(0, $meta.Name.Length - ".meta".Length).ToLowerInvariant()
    $metaNames[$targetName] = $true
}

$missingMetas = @()
foreach ($bin in $binFiles) {
    if (-not $metaNames.ContainsKey($bin.Name.ToLowerInvariant())) {
        $missingMetas += $bin.Name
    }
}

if ($orphanMetas.Count -gt 0 -or $missingMetas.Count -gt 0) {
    Write-Output ""
    Write-Output "Warnings:"
    foreach ($name in $orphanMetas) {
        Write-Output ("  orphan meta without bin: {0}" -f $name)
    }
    foreach ($name in $missingMetas) {
        Write-Output ("  bin without meta: {0}" -f $name)
    }
}

Write-Output ""
Write-Output "Runtime hints:"

$tableModule = "Client\assets\ty-framework\module\table\TableModule.ts"
if (Test-Path -LiteralPath $tableModule) {
    Select-String -LiteralPath $tableModule -Pattern "loadDirAsync|bundle|BufferAsset|new Tables|ByteBuf" |
        ForEach-Object {
            "  {0}:{1}: {2}" -f $_.Path, $_.LineNumber, $_.Line.Trim()
        }
}
