param(
  [switch]$Seed
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $root
$migrationsDir = Join-Path $repoRoot "apps\api\prisma\migrations"

Push-Location (Join-Path $repoRoot "apps\api")
try {
  Get-ChildItem $migrationsDir -Directory | Sort-Object Name | ForEach-Object {
    $name = $_.Name
    Write-Host "Baseline: $name" -ForegroundColor Cyan
    node scripts/with-root-env.js npx prisma migrate resolve --applied $name
    if ($LASTEXITCODE -ne 0) { throw "Echec baseline migration $name" }
  }

  if ($Seed) {
    Write-Host "Seed des donnees demo..." -ForegroundColor Cyan
    npm run prisma:seed
    if ($LASTEXITCODE -ne 0) { throw "Echec seed" }
  }

  Write-Host "OK - Prisma est aligne avec Supabase." -ForegroundColor Green
} finally {
  Pop-Location
}
