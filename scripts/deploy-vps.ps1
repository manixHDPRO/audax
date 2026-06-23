param(
  [string]$VpsHost = "187.77.72.4",
  [string]$SshUser = "root",
  [string]$InstallDir = "/root/Audax",
  [string]$RepoUrl = "https://github.com/manixHDPRO/audax.git",
  [switch]$Seed
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir
$deployScript = Join-Path $scriptDir "deploy-vps.sh"
$envFile = Join-Path $rootDir ".env"

if (-not (Test-Path $envFile)) {
  throw "Fichier .env introuvable. Copiez .env.example et configurez Supabase + JWT."
}

Write-Host ""
Write-Host "=== Deploi Audax sur VPS (Node.js + PM2) ===" -ForegroundColor Cyan
Write-Host "VPS: ${SshUser}@${VpsHost}" -ForegroundColor Gray
Write-Host "Dossier distant: $InstallDir" -ForegroundColor Gray
Write-Host ""

$envContent = Get-Content $envFile -Raw
$apiUrl = "http://${VpsHost}:4000/api"
$webUrl = "http://${VpsHost}:3000"

function Set-EnvValue {
  param([string]$Content, [string]$Key, [string]$Value)
  if ($Content -match "(?m)^$Key=.*$") {
    return [regex]::Replace($Content, "(?m)^$Key=.*$", "$Key=`"$Value`"")
  }
  return "$Content`n$Key=`"$Value`""
}

$envContent = Set-EnvValue $envContent "NEXT_PUBLIC_API_URL" $apiUrl
$envContent = Set-EnvValue $envContent "CORS_ORIGIN" $webUrl

$tempEnv = Join-Path $env:TEMP "audax-vps.env"
Set-Content -Path $tempEnv -Value $envContent -NoNewline

Write-Host "Variables production:" -ForegroundColor Gray
Write-Host "  NEXT_PUBLIC_API_URL = $apiUrl" -ForegroundColor Gray
Write-Host "  CORS_ORIGIN         = $webUrl" -ForegroundColor Gray
Write-Host ""

if ($envContent -match 'JWT_SECRET="change-me') {
  Write-Host "ATTENTION: JWT_SECRET utilise encore la valeur par defaut." -ForegroundColor Yellow
  Write-Host "           Changez-le dans .env avant un deploi production." -ForegroundColor Yellow
  Write-Host ""
}

$confirm = Read-Host "Lancer le deploi ? (oui/non)"
if ($confirm -notmatch '^(oui|o|yes|y)$') {
  Write-Host "Annule." -ForegroundColor DarkGray
  Remove-Item $tempEnv -ErrorAction SilentlyContinue
  exit 0
}

Write-Host ""
Write-Host "1/4 Clone ou mise a jour du depot (mot de passe root demande)..." -ForegroundColor Cyan
$cloneCmd = @"
if [ ! -d '$InstallDir/.git' ]; then
  rm -rf '$InstallDir'
  git clone '$RepoUrl' '$InstallDir'
else
  cd '$InstallDir' && git pull origin main
fi
"@
ssh "${SshUser}@${VpsHost}" $cloneCmd
if ($LASTEXITCODE -ne 0) { throw "Echec clone/pull Git." }

Write-Host "2/4 Copie du .env de production..." -ForegroundColor Cyan
scp $tempEnv "${SshUser}@${VpsHost}:${InstallDir}/.env"
if ($LASTEXITCODE -ne 0) { throw "Echec copie .env." }
Remove-Item $tempEnv -ErrorAction SilentlyContinue

$ecosystemFile = Join-Path $rootDir "ecosystem.config.cjs"
Write-Host "3/4 Copie des fichiers de deploi..." -ForegroundColor Cyan
scp $ecosystemFile "${SshUser}@${VpsHost}:${InstallDir}/ecosystem.config.cjs"
if ($LASTEXITCODE -ne 0) { throw "Echec copie ecosystem.config.cjs." }

scp $deployScript "${SshUser}@${VpsHost}:/tmp/deploy-vps.sh"
if ($LASTEXITCODE -ne 0) { throw "Echec copie script." }

Write-Host "4/4 Build et demarrage (PM2)..." -ForegroundColor Cyan

$seedFlag = if ($Seed) { "--seed" } else { "" }
ssh "${SshUser}@${VpsHost}" "chmod +x /tmp/deploy-vps.sh && INSTALL_DIR='$InstallDir' /tmp/deploy-vps.sh $seedFlag && rm -f /tmp/deploy-vps.sh"
if ($LASTEXITCODE -ne 0) { throw "Echec deploi VPS." }

Write-Host ""
Write-Host "Deploi termine." -ForegroundColor Green
Write-Host "  Frontend : http://${VpsHost}:3000" -ForegroundColor Green
Write-Host "  API      : http://${VpsHost}:4000/api" -ForegroundColor Green
Write-Host "  Swagger  : http://${VpsHost}:4000/api/docs" -ForegroundColor Green
Write-Host "  Logs     : ssh ${SshUser}@${VpsHost} pm2 logs" -ForegroundColor Green
if ($Seed) {
  Write-Host "  Comptes  : admin@audax.fardc.cd / Audax2026!" -ForegroundColor Green
}
Write-Host ""
