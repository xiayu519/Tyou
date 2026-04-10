param(
    [Parameter(Mandatory = $true)]
    [string]$PsdPath,

    [Parameter(Mandatory = $true)]
    [string]$JsxPath
)

$ErrorActionPreference = 'Stop'

$created = $false
$app = $null
$doc = $null

try {
    try {
        $app = [Runtime.InteropServices.Marshal]::GetActiveObject('Photoshop.Application')
    } catch {
        $app = New-Object -ComObject Photoshop.Application
        $created = $true
    }

    if (-not $app) {
        throw 'Unable to acquire Photoshop.Application COM object.'
    }

    $resolvedPsdPath = (Resolve-Path -LiteralPath $PsdPath).Path
    $resolvedJsxPath = (Resolve-Path -LiteralPath $JsxPath).Path
    $jsxEscaped = $resolvedJsxPath.Replace('\', '\\').Replace("'", "\\'")

    $doc = $app.Open($resolvedPsdPath)

    $script = @"
var __psd2ccc_messages = [];
alert = function (message) { __psd2ccc_messages.push(String(message)); };
$.evalFile('$jsxEscaped');
__psd2ccc_messages.join('\n');
"@

    $result = $app.DoJavaScript($script)
    if ($result) {
        Write-Output $result
    }
}
finally {
    if ($doc) {
        try { $doc.Close(2) } catch {}
    }

    if ($created -and $app) {
        try { $app.Quit() } catch {}
    }
}
