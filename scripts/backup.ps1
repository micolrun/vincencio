$ErrorActionPreference = 'Stop'
$installRoot = 'C:\VincentioStudio'
$dataRoot = Join-Path $installRoot 'data'
$backupRoot = Join-Path $installRoot 'backups'
$stamp = Get-Date -Format 'yyyy-MM-dd_HHmmss'
$destination = Join-Path $backupRoot $stamp

if (-not (Test-Path -LiteralPath $dataRoot)) {
    throw '백업할 데이터 폴더가 없습니다.'
}
New-Item -ItemType Directory -Path $destination -Force | Out-Null
Copy-Item -LiteralPath $dataRoot -Destination $destination -Recurse -Force
Write-Host "백업 완료: $destination" -ForegroundColor Green

