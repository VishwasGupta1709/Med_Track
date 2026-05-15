$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host "MedTrack dev startup" -ForegroundColor Cyan
Write-Host "Project root: $ProjectRoot"

Write-Host ""
Write-Host "Checking Docker..."
docker info *> $null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Docker is not running or is not reachable. Start Docker Desktop, then try again." -ForegroundColor Red
  exit 1
}
Write-Host "Docker is running." -ForegroundColor Green

$containerName = "medtrack-postgres"
$existingContainer = docker ps -a --filter "name=^/$containerName$" --format "{{.Names}}"
$runningContainer = docker ps --filter "name=^/$containerName$" --format "{{.Names}}"

Write-Host ""
Write-Host "Checking PostgreSQL container..."
if ($existingContainer -eq $containerName) {
  if ($runningContainer -eq $containerName) {
    Write-Host "$containerName is already running." -ForegroundColor Green
  } else {
    Write-Host "$containerName exists but is stopped. Starting it..."
    docker start $containerName | Out-Host
  }
} else {
  $composeFileExists = (Test-Path "docker-compose.yml") -or (Test-Path "compose.yaml") -or (Test-Path "compose.yml")

  if (-not $composeFileExists) {
    Write-Host "No Docker Compose file found. Cannot create $containerName." -ForegroundColor Red
    exit 1
  }

  Write-Host "$containerName does not exist. Starting services with Docker Compose..."
  docker compose up -d
}

Write-Host ""
Write-Host "Generating Prisma client..."
npx prisma generate

Write-Host ""
Write-Host "Checking Prisma migration status..."
npx prisma migrate status
if ($LASTEXITCODE -ne 0) {
  Write-Host "Prisma migration status failed. Run 'npx prisma migrate dev' if migrations need to be applied." -ForegroundColor Red
  exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Starting Next.js dev server..."
npm run dev
