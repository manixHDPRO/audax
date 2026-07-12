param(
  [string]$VpsHost = "187.77.72.4",
  [string]$SshUser = "root",
  [string]$InstallDir = "/root/Audax",
  [string]$RepoUrl = "https://github.com/manixHDPRO/audax.git",
  # Domaine public HTTPS (Nginx). Si omis, conserve NEXT_PUBLIC_API_URL / CORS_ORIGIN du .env.
  [string]$PublicHost = "",
  [switch]$Seed
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir
$deployScript = Join-Path $scriptDir "deploy-vps.sh"
$envFile = Join-Path $rootDir ".env"

if (-not (Test-Path $envFile)) {
  throw "Fichier .env introuvable. Copiez .env.production.example et configurez Supabase + JWT + TLS."
}

Write-Host ""
Write-Host "=== Deploi Audax sur VPS (Node.js + PM2) ===" -ForegroundColor Cyan
Write-Host "VPS: ${SshUser}@${VpsHost}" -ForegroundColor Gray
Write-Host "Dossier distant: $InstallDir" -ForegroundColor Gray
Write-Host ""

$envContent = Get-Content $envFile -Raw

function Set-EnvValue {
  param([string]$Content, [string]$Key, [string]$Value)
  if ($Content -match "(?m)^$Key=.*$") {
    return [regex]::Replace($Content, "(?m)^$Key=.*$", "$Key=`"$Value`"")
  }
  return "$Content`n$Key=`"$Value`""
}

function Get-EnvValue {
  param([string]$Content, [string]$Key)
  if ($Content -match "(?m)^$Key=`"?([^`"`r`n]+)`"?") {
    return $Matches[1]
  }
  return $null
}

$jwtSecret = Get-EnvValue $envContent "JWT_SECRET"
if (-not $jwtSecret -or $jwtSecret.Length -lt 32 -or $jwtSecret -match '(?i)change-me|dev-secret|generate-a-long|replace_with_') {
  throw "JWT_SECRET invalide ou trop faible. Generez avec: openssl rand -base64 48"
}

if ($PublicHost) {
  $apiUrl = "https://${PublicHost}/api"
  $webUrl = "https://${PublicHost}"
  $envContent = Set-EnvValue $envContent "NEXT_PUBLIC_API_URL" $apiUrl
  $envContent = Set-EnvValue $envContent "CORS_ORIGIN" $webUrl
  $envContent = Set-EnvValue $envContent "PUBLIC_HOST" $PublicHost
  $envContent = Set-EnvValue $envContent "ENABLE_SWAGGER" "false"
} else {
  $apiUrl = Get-EnvValue $envContent "NEXT_PUBLIC_API_URL"
  $webUrl = Get-EnvValue $envContent "CORS_ORIGIN"
  if (-not $apiUrl -or -not $webUrl) {
    throw "NEXT_PUBLIC_API_URL et CORS_ORIGIN requis dans .env (ou passez -PublicHost votre.domaine.tld)."
  }
  if ($apiUrl -match '^http://' -or $webUrl -match '^http://') {
    Write-Host "ATTENTION: URLs en HTTP. Configurez TLS (deploy/TLS.md) avant production reelle." -ForegroundColor Yellow
    Write-Host "           Exemple: .\scripts\deploy-vps.ps1 -PublicHost audax.example.com" -ForegroundColor Yellow
    Write-Host ""
  }
}

$tempEnv = Join-Path $env:TEMP "audax-vps.env"
Set-Content -Path $tempEnv -Value $envContent -NoNewline

Write-Host "Variables production:" -ForegroundColor Gray
Write-Host "  NEXT_PUBLIC_API_URL = $apiUrl" -ForegroundColor Gray
Write-Host "  CORS_ORIGIN         = $webUrl" -ForegroundColor Gray
Write-Host "  ENABLE_SWAGGER      = false (prod)" -ForegroundColor Gray
Write-Host ""

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
if ($PublicHost) {
  Write-Host "  Frontend : https://${PublicHost}" -ForegroundColor Green
  Write-Host "  API      : https://${PublicHost}/api" -ForegroundColor Green
} else {
  Write-Host "  Frontend : $webUrl" -ForegroundColor Green
  Write-Host "  API      : $apiUrl" -ForegroundColor Green
}
Write-Host "  Swagger  : desactive en production" -ForegroundColor Green
Write-Host "  TLS      : deploy/TLS.md" -ForegroundColor Green
Write-Host "  Logs     : ssh ${SshUser}@${VpsHost} pm2 logs" -ForegroundColor Green
if ($Seed) {
  Write-Host "  ATTENTION: --Seed active. Ne pas utiliser en production avec comptes demo." -ForegroundColor Yellow
}
Write-Host ""
