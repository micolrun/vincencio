$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$releaseRoot = Join-Path $projectRoot 'dist\VincentioStudio'
$resolvedProject = [System.IO.Path]::GetFullPath($projectRoot).TrimEnd('\')
$resolvedRelease = [System.IO.Path]::GetFullPath($releaseRoot)
if (-not $resolvedRelease.StartsWith($resolvedProject + '\dist\', [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "안전하지 않은 배포 경로입니다: $resolvedRelease"
}

if (Test-Path -LiteralPath $releaseRoot) {
    Remove-Item -LiteralPath $releaseRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $releaseRoot | Out-Null

$items = @(
    'app', 'remotion', 'static', 'public', 'scripts', 'tests',
    'run.py', 'requirements.txt', 'package.json', 'package-lock.json',
    '.env.example', 'README.md', 'SECURITY.md'
)
foreach ($item in $items) {
    $source = Join-Path $projectRoot $item
    if (Test-Path -LiteralPath $source) {
        Copy-Item -LiteralPath $source -Destination $releaseRoot -Recurse -Force
    }
}

New-Item -ItemType Directory -Path (Join-Path $releaseRoot 'data\jobs') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $releaseRoot 'public\jobs') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $releaseRoot 'renders') -Force | Out-Null
