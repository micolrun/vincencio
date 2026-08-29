$ErrorActionPreference = 'Stop'
$installRoot = 'C:\VincentioStudio'
$appRoot = Join-Path $installRoot 'app'
$python = Join-Path $appRoot '.venv\Scripts\python.exe'
$envFile = Join-Path $installRoot 'secrets\.env'

if (-not (Test-Path -LiteralPath $python)) {
    throw '프로그램이 설치되지 않았습니다. scripts\install.ps1을 먼저 실행하세요.'
}
if (Test-Path -LiteralPath $envFile) {
    Copy-Item -LiteralPath $envFile -Destination (Join-Path $appRoot '.env') -Force
}

Push-Location $appRoot
try {
    Start-Process 'http://127.0.0.1:8010'
    & $python run.py
} finally {
    Pop-Location
}

