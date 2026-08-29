$ErrorActionPreference = 'Stop'
$sourceRoot = Split-Path -Parent $PSScriptRoot
$installRoot = 'C:\VincentioStudio'
$appRoot = Join-Path $installRoot 'app'
$resolvedInstall = [System.IO.Path]::GetFullPath($installRoot).TrimEnd('\')
$resolvedApp = [System.IO.Path]::GetFullPath($appRoot)
if ($resolvedInstall -ne 'C:\VincentioStudio' -or -not $resolvedApp.StartsWith($resolvedInstall + '\', [System.StringComparison]::OrdinalIgnoreCase)) {
    throw '설치 경로 안전성 검사에 실패했습니다.'
}

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    throw 'Python 3.13 이상을 먼저 설치해 주세요.'
}
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw 'Node.js 22 LTS 이상을 먼저 설치해 주세요.'
}

@('data', 'backups', 'secrets', 'logs') | ForEach-Object {
    New-Item -ItemType Directory -Path (Join-Path $installRoot $_) -Force | Out-Null
}
New-Item -ItemType Directory -Path $appRoot -Force | Out-Null

$copyItems = @('app', 'remotion', 'static', 'public', 'scripts', 'run.py', 'requirements.txt', 'package.json', 'package-lock.json', '.env.example')
foreach ($item in $copyItems) {
    $source = Join-Path $sourceRoot $item
    $target = Join-Path $appRoot $item
    if (Test-Path -LiteralPath $target) {
        Remove-Item -LiteralPath $target -Recurse -Force
    }
    Copy-Item -LiteralPath $source -Destination $target -Recurse -Force
}

$venvPython = Join-Path $appRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $venvPython)) {
    python -m venv (Join-Path $appRoot '.venv')
}
& $venvPython -m pip install --disable-pip-version-check -r (Join-Path $appRoot 'requirements.txt')
Push-Location $appRoot
try { npm.cmd ci } finally { Pop-Location }

$envTarget = Join-Path $installRoot 'secrets\.env'
if (-not (Test-Path -LiteralPath $envTarget)) {
    Copy-Item -LiteralPath (Join-Path $appRoot '.env.example') -Destination $envTarget
}

Write-Host ''
Write-Host '설치가 완료되었습니다.' -ForegroundColor Green
Write-Host '설정 파일:' $envTarget
Write-Host '실행 명령: powershell -ExecutionPolicy Bypass -File C:\VincentioStudio\app\scripts\start.ps1'
