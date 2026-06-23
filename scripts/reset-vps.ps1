param(
  [string]$VpsHost = "187.77.72.4",
  [string]$SshUser = "root"
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$resetScript = Join-Path $scriptDir "reset-vps.sh"

Write-Host ""
Write-Host "=== Reset complet VPS Audax ===" -ForegroundColor Red
Write-Host "VPS: ${SshUser}@${VpsHost}" -ForegroundColor Gray
Write-Host ""
Write-Host "ATTENTION : cette operation supprime tout le deploiement Audax sur le VPS." -ForegroundColor Yellow
Write-Host "  - Conteneurs Docker (api, web, postgres, redis)" -ForegroundColor Yellow
Write-Host "  - Volumes (donnees PostgreSQL et Redis)" -ForegroundColor Yellow
Write-Host "  - Images Docker et dossier du projet" -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "Continuer ? (oui/non)"
if ($confirm -notmatch '^(oui|o|yes|y)$') {
  Write-Host "Annule." -ForegroundColor DarkGray
  exit 0
}

Write-Host ""
Write-Host "1/2 Copie du script sur le VPS (mot de passe root demande)..." -ForegroundColor Cyan
scp $resetScript "${SshUser}@${VpsHost}:/tmp/reset-vps.sh"
if ($LASTEXITCODE -ne 0) { throw "Echec SCP." }

Write-Host "2/2 Execution du reset sur le VPS..." -ForegroundColor Cyan
ssh "${SshUser}@${VpsHost}" "chmod +x /tmp/reset-vps.sh && /tmp/reset-vps.sh && rm -f /tmp/reset-vps.sh"
if ($LASTEXITCODE -ne 0) { throw "Echec reset VPS." }

Write-Host ""
Write-Host "Reset VPS termine." -ForegroundColor Green
Write-Host ""
