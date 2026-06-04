#!/usr/bin/env pwsh
# loadtest.ps1 — Run baseline + heavy load tests, capture auto-scaling evidence
param([string]$AlbUrl = "")

$ErrorActionPreference = "Stop"
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")

if (-not $AlbUrl) {
  Set-Location "$PSScriptRoot"
  $AlbUrl = (terraform output -raw alb_url)
}

$EvidenceDir = "$PSScriptRoot\evidence"
New-Item -ItemType Directory -Force -Path $EvidenceDir | Out-Null

$Region  = "eu-west-1"
$Cluster = "wholesale-crm"
$Service = "wholesale-crm"

# Install autocannon if needed
if (-not (Get-Command autocannon -ErrorAction SilentlyContinue)) {
  Write-Host "Installing autocannon..." -ForegroundColor Cyan
  npm install -g autocannon
}

function Get-TaskCount {
  $svc = aws ecs describe-services --cluster $Cluster --services $Service --region $Region | ConvertFrom-Json
  return $svc.services[0].runningCount
}

function Get-CpuUtilization {
  $end   = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  $start = (Get-Date).AddMinutes(-2).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  $dims  = '[{"Name":"ClusterName","Value":"wholesale-crm"},{"Name":"ServiceName","Value":"wholesale-crm"}]'
  $stats = aws cloudwatch get-metric-statistics `
    --namespace AWS/ECS `
    --metric-name CPUUtilization `
    --dimensions $dims `
    --start-time $start --end-time $end `
    --period 60 --statistics Average `
    --region $Region | ConvertFrom-Json
  if ($stats.Datapoints.Count -gt 0) {
    return [math]::Round(($stats.Datapoints | Sort-Object Timestamp | Select-Object -Last 1).Average, 1)
  }
  return "N/A"
}

Write-Host "`n══════════════════════════════════════════" -ForegroundColor Magenta
Write-Host " PHASE 1 — Baseline load test (60 s, 10 connections)" -ForegroundColor Magenta
Write-Host "══════════════════════════════════════════" -ForegroundColor Magenta

$baselineTasksBefore = Get-TaskCount
Write-Host "Tasks before: $baselineTasksBefore"

$baseline = autocannon -d 60 -c 10 -j "$AlbUrl/health" 2>&1
$baseline | Out-File "$EvidenceDir\baseline_raw.json" -Encoding utf8
Write-Host $baseline

Write-Host "`n══════════════════════════════════════════" -ForegroundColor Magenta
Write-Host " PHASE 2 — Heavy load test (120 s, 50 connections) against /api/system/load" -ForegroundColor Magenta
Write-Host "══════════════════════════════════════════" -ForegroundColor Magenta

$tasksBeforeHeavy = Get-TaskCount
Write-Host "Tasks before heavy test: $tasksBeforeHeavy"
Write-Host "Starting heavy test — polling task count + CPU every 30 s..."

# Run load test in background
$job = Start-Job -ScriptBlock {
  param($url)
  autocannon -d 120 -c 50 -j "$url/api/system/load"
} -ArgumentList $AlbUrl

# Poll every 30 s while test runs
$instances = @{}
$pollLog   = @()
for ($i = 0; $i -lt 5; $i++) {
  Start-Sleep -Seconds 30
  $tc  = Get-TaskCount
  $cpu = Get-CpuUtilization
  $ts  = Get-Date -Format "HH:mm:ss"

  # Collect distinct X-Instance-ID values
  for ($r = 0; $r -lt 5; $r++) {
    $h = curl.exe -s -I "$AlbUrl/health" 2>$null
    $id = ($h -split "`n" | Select-String "x-instance-id").ToString().Trim().Split(":")[1].Trim()
    if ($id) { $instances[$id] = $true }
  }

  $entry = "[$ts] Tasks: $tc | CPU: $cpu% | Distinct instances seen: $($instances.Count)"
  Write-Host $entry -ForegroundColor Yellow
  $pollLog += $entry
}

$heavyResult = Receive-Job -Job $job -Wait
$heavyResult | Out-File "$EvidenceDir\heavy_raw.json" -Encoding utf8

$tasksAfterHeavy = Get-TaskCount
$finalCpu        = Get-CpuUtilization

# ── Collect final instance spread ─────────────────────────────────────────────
Write-Host "`nChecking instance spread across ALB..."
for ($r = 0; $r -lt 20; $r++) {
  $h = curl.exe -s -I "$AlbUrl/health" 2>$null
  $id = ($h -split "`n" | Select-String "x-instance-id").ToString().Trim()
  if ($id -match ": (.+)") { $instances[$Matches[1].Trim()] = $true }
}
$instanceList = $instances.Keys -join ", "

Write-Host "`nDistinct X-Instance-ID values: $instanceList" -ForegroundColor Green
Write-Host "Tasks after heavy test: $tasksAfterHeavy (was $tasksBeforeHeavy)" -ForegroundColor Green

# ── Parse autocannon JSON ──────────────────────────────────────────────────────
function Parse-AC($raw) {
  try {
    $j = $raw | ConvertFrom-Json
    return @{
      rps_avg = $j.requests.average
      p50     = $j.latency.p50
      p99     = $j.latency.p99
      errors  = $j.errors
    }
  } catch { return @{ rps_avg = "N/A"; p50 = "N/A"; p99 = "N/A"; errors = "N/A" } }
}

$bStats = Parse-AC (Get-Content "$EvidenceDir\baseline_raw.json" -Raw)
$hStats = Parse-AC (Get-Content "$EvidenceDir\heavy_raw.json"   -Raw)

# ── Write results.md ──────────────────────────────────────────────────────────
$resultsContent = @"
# Load Test Results
**Date:** $(Get-Date -Format "yyyy-MM-dd HH:mm UTC")
**ALB URL:** $AlbUrl

## Phase 1 — Baseline (60 s · 10 connections · /health)
| Metric | Value |
|---|---|
| Requests/sec (avg) | $($bStats.rps_avg) |
| Latency p50 | $($bStats.p50) ms |
| Latency p99 | $($bStats.p99) ms |
| Errors | $($bStats.errors) |
| Task count | $baselineTasksBefore (unchanged) |

## Phase 2 — Heavy (120 s · 50 connections · /api/system/load)
| Metric | Value |
|---|---|
| Requests/sec (avg) | $($hStats.rps_avg) |
| Latency p50 | $($hStats.p50) ms |
| Latency p99 | $($hStats.p99) ms |
| Errors | $($hStats.errors) |
| Tasks before | $tasksBeforeHeavy |
| Tasks after | $tasksAfterHeavy |
| CPU at end | $finalCpu% |

## Auto-Scaling Poll Log
$($pollLog -join "`n")

## ALB Instance Distribution
Distinct X-Instance-ID headers observed: **$($instances.Count)**
Values: $instanceList
"@

$resultsContent | Out-File "$EvidenceDir\results.md" -Encoding utf8
Write-Host "`n✅ Results saved to infra/evidence/results.md" -ForegroundColor Green
Write-Host $resultsContent
