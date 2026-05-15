$ErrorActionPreference = "Continue"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host "MedTrack dev shutdown" -ForegroundColor Cyan
Write-Host "Project root: $ProjectRoot"

$ports = @(3000, 3001, 5555)

Write-Host ""
Write-Host "Stopping local development processes on ports: $($ports -join ', ')"
foreach ($port in $ports) {
  $connections = netstat -ano | Select-String "LISTENING" | Select-String ":$port "
  $processIds = @()

  foreach ($connection in $connections) {
    $parts = $connection.Line.Trim() -split "\s+"
    if ($parts.Length -ge 5) {
      $processIds += $parts[-1]
    }
  }

  $processIds = $processIds | Sort-Object -Unique

  if ($processIds.Count -eq 0) {
    Write-Host "No process is listening on port $port."
    continue
  }

  foreach ($processId in $processIds) {
    Write-Host "Stopping process $processId on port $port..."
    Stop-Process -Id ([int]$processId) -ErrorAction SilentlyContinue
  }
}

$containerName = "medtrack-postgres"

Write-Host ""
Write-Host "Checking PostgreSQL container..."
$runningContainer = docker ps --filter "name=^/$containerName$" --format "{{.Names}}" 2>$null
if ($runningContainer -eq $containerName) {
  Write-Host "Stopping $containerName without deleting volumes..."
  docker stop $containerName | Out-Host
} else {
  Write-Host "$containerName is not running."
}

Write-Host ""
Write-Host "Git status:"
git status --short

Write-Host ""
Write-Host "Shutdown complete. Local database data was preserved." -ForegroundColor Green
