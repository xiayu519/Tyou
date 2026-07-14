$ErrorActionPreference = "Stop"
$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "../../../.."))
$script = Join-Path $root ".agents/skills/tyou-dev/scripts/check-change-boundary.ps1"

function Invoke-BoundaryCase {
    param(
        [string] $Name,
        [int] $ExpectedExit,
        [string[]] $Arguments
    )
    $output = & powershell -NoProfile -ExecutionPolicy Bypass -File $script @Arguments 2>&1
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne $ExpectedExit) {
        throw "$Name expected exit $ExpectedExit, got $exitCode`n$($output | Out-String)"
    }
    "[PASS] $Name"
}

Set-Location $root

Invoke-BoundaryCase "within-declared-roots" 0 @(
    "-Files", "AGENTS.md,README.md",
    "-AllowedRoots", "AGENTS.md,README.md"
)

Invoke-BoundaryCase "generated-separated" 0 @(
    "-Files", "AGENTS.md,Books/AI-Development-Workflow.md",
    "-GeneratedFiles", "Books/AI-Development-Workflow.md",
    "-AllowedRoots", "."
)

Invoke-BoundaryCase "many-files-have-no-count-gate" 0 @(
    "-Files", "AGENTS.md,README.md,Books/AI-Development-Workflow.md,wiki-sync.yaml,.agents/skills/sdd-explore/SKILL.md",
    "-AllowedRoots", "."
)

Invoke-BoundaryCase "outside-roots" 1 @(
    "-Files", "README.md",
    "-AllowedRoots", ".agents"
)

Invoke-BoundaryCase "generated-must-be-listed" 1 @(
    "-Files", "AGENTS.md",
    "-GeneratedFiles", "README.md"
)

"Change boundary checker tests passed"
