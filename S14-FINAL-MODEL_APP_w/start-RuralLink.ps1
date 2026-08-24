param([switch]$Install)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'
$envFile = Join-Path $backend '.env'

if (-not (Test-Path $envFile)) {
    Copy-Item (Join-Path $backend '.env.example') $envFile
    Write-Warning 'Created backend\.env. Paste your ORS and Gemini keys there, then run this script again.'
    exit 1
}

if (-not (Test-Path (Join-Path $backend '.venv\Scripts\python.exe'))) {
    python -m venv (Join-Path $backend '.venv')
    $Install = $true
}
if ($Install) {
    & (Join-Path $backend '.venv\Scripts\python.exe') -m pip install -r (Join-Path $backend 'requirements.txt')
}
if (-not (Select-String -LiteralPath $envFile -Pattern '^ORS_API_KEY=.+$' -Quiet)) {
    Write-Warning 'Add ORS_API_KEY and GEMINI_API_KEY to backend\.env before starting for the complete live pipeline.'
}
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$backend'; & '.\.venv\Scripts\python.exe' -m uvicorn app.main:app --reload --port 8000"
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$frontend'; & '$backend\.venv\Scripts\python.exe' -m http.server 3000"
Write-Host 'Open http://127.0.0.1:3000 after both windows report they are running.'
