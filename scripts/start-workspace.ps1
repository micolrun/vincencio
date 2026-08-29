$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$python = Join-Path $projectRoot '.venv\Scripts\python.exe'
$runFile = Join-Path $projectRoot 'run.py'
$logRoot = Join-Path $projectRoot 'logs'
$healthUrl = 'http://127.0.0.1:8010/api/health'
$appUrl = 'http://127.0.0.1:8010'

if (-not (Test-Path -LiteralPath $python)) {
    throw '실행 환경이 없습니다. 먼저 README의 빠른 시작 설치를 진행하세요.'
}
if (-not (Test-Path -LiteralPath $runFile)) {
    throw "run.py를 찾을 수 없습니다: $runFile"
}

function Test-VincentioServer {
    try {
        $response = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2
        return $response.ok -eq $true
    } catch {
        return $false
    }
}

if (-not (Test-VincentioServer)) {
    New-Item -ItemType Directory -Path $logRoot -Force | Out-Null
    $stdout = Join-Path $logRoot 'server.out.log'
    $stderr = Join-Path $logRoot 'server.err.log'
    Start-Process -FilePath $python `
        -ArgumentList 'run.py' `
        -WorkingDirectory $projectRoot `
        -WindowStyle Hidden `
        -RedirectStandardOutput $stdout `
        -RedirectStandardError $stderr

    $ready = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        Start-Sleep -Seconds 1
        if (Test-VincentioServer) {
            $ready = $true
            break
        }
    }
    if (-not $ready) {
        $details = if (Test-Path -LiteralPath $stderr) {
            (Get-Content -LiteralPath $stderr -Tail 30) -join [Environment]::NewLine
        } else {
            '서버 오류 로그가 생성되지 않았습니다.'
        }
        throw "서버가 30초 안에 시작되지 않았습니다.`n$details"
    }
}

Start-Process $appUrl
Write-Host '빈첸시오 말씀방 영상 스튜디오가 실행되었습니다.' -ForegroundColor Green

