$ErrorActionPreference = "SilentlyContinue"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$webNext = Join-Path $projectRoot "apps\web\.next"

$pids = Get-CimInstance Win32_Process -Filter "name='node.exe'" |
  Where-Object { $_.CommandLine -match [regex]::Escape("Mes Projects\Audax") } |
  Select-Object -ExpandProperty ProcessId -Unique

if ($pids) {
  Write-Host "Arret de $($pids.Count) processus Audax..." -ForegroundColor Yellow
  $pids | ForEach-Object { Stop-Process -Id $_ -Force }
  Start-Sleep -Seconds 2
} else {
  Write-Host "Aucun processus Audax en cours." -ForegroundColor DarkGray
}

if (Test-Path $webNext) {
  Remove-Item -Recurse -Force $webNext
  Write-Host "Cache .next supprime." -ForegroundColor Cyan
}

$ports = netstat -ano | Select-String "LISTENING" | Select-String ":3000|:4000"
if ($ports) {
  Write-Host "Attention: ports encore occupes:" -ForegroundColor Red
  $ports | ForEach-Object { Write-Host $_ }
  exit 1
}

Write-Host "Pret pour npm run dev (ports 3000 et 4000 libres)." -ForegroundColor Green
