param(
  [string]$VpsHost = "187.77.72.4",
  [string]$SshUser = "root",
  [int]$LocalPort = 5433,
  [int]$RemotePort = 5432
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir

Set-Location $rootDir

if (-not (Test-Path ".env")) {
  throw "Fichier .env introuvable. Copiez .env.example et configurez DATABASE_URL."
}

Write-Host ""
Write-Host "=== Import base de donnees Audax sur VPS ===" -ForegroundColor Cyan
Write-Host "VPS: ${SshUser}@${VpsHost}" -ForegroundColor Gray
Write-Host "Tunnel: localhost:${LocalPort} -> ${VpsHost}:127.0.0.1:${RemotePort}" -ForegroundColor Gray
Write-Host ""

$tunnel = Get-Process -Name ssh -ErrorAction SilentlyContinue | Where-Object {
  $_.CommandLine -like "*${LocalPort}:127.0.0.1:${RemotePort}*"
}

if (-not $tunnel) {
  Write-Host "Demarrage du tunnel SSH (mot de passe root demande)..." -ForegroundColor Yellow
  Write-Host "Laissez cette fenetre ouverte pendant l'import." -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Dans un AUTRE terminal PowerShell, lancez:" -ForegroundColor Green
  Write-Host "  ssh -L ${LocalPort}:127.0.0.1:${RemotePort} ${SshUser}@${VpsHost} -N" -ForegroundColor White
  Write-Host ""
  Read-Host "Appuyez sur Entree une fois le tunnel SSH actif"

  $test = Test-NetConnection -ComputerName 127.0.0.1 -Port $LocalPort -WarningAction SilentlyContinue
  if (-not $test.TcpTestSucceeded) {
    throw "Tunnel SSH inactif sur le port ${LocalPort}. Verifiez la connexion SSH."
  }
}

Write-Host "1/3 Generation du client Prisma..." -ForegroundColor Cyan
npm run db:generate
if ($LASTEXITCODE -ne 0) { throw "Echec prisma generate." }

Write-Host "2/3 Application des migrations (structure)..." -ForegroundColor Cyan
npm run db:migrate:deploy
if ($LASTEXITCODE -ne 0) { throw "Echec migrate deploy." }

Write-Host "3/3 Insertion des donnees initiales (seed)..." -ForegroundColor Cyan
npm run db:seed
if ($LASTEXITCODE -ne 0) { throw "Echec seed." }

Write-Host ""
Write-Host "Import termine avec succes." -ForegroundColor Green
Write-Host "Comptes: admin@audax.fardc.cd / Audax2026!" -ForegroundColor Green
Write-Host ""
