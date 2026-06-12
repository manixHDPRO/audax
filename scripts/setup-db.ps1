param(
  [Parameter(Mandatory = $true, HelpMessage = "Mot de passe du superutilisateur postgres")]
  [string]$PostgresPassword
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$sqlFile = Join-Path $scriptDir "setup-postgres.sql"

$env:PGPASSWORD = $PostgresPassword
Write-Host "Creation de l'utilisateur audax..." -ForegroundColor Cyan
psql -U postgres -h localhost -p 5432 -f $sqlFile
if ($LASTEXITCODE -ne 0) { throw "Echec creation utilisateur (code $LASTEXITCODE)." }

$dbExists = (psql -U postgres -h localhost -p 5432 -tAc "SELECT 1 FROM pg_database WHERE datname = 'audax'") -replace '\s', ''
if (-not $dbExists) {
  Write-Host "Creation de la base audax..." -ForegroundColor Cyan
  psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE audax OWNER audax;"
  if ($LASTEXITCODE -ne 0) { throw "Echec creation base (code $LASTEXITCODE)." }
} else {
  Write-Host "Base audax deja presente." -ForegroundColor Yellow
}

psql -U postgres -h localhost -p 5432 -c "GRANT ALL PRIVILEGES ON DATABASE audax TO audax;"

Write-Host "OK. Lancez ensuite:" -ForegroundColor Green
Write-Host "  npm run db:migrate"
Write-Host "  npm run db:seed"
