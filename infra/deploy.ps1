#!/usr/bin/env pwsh
# deploy.ps1 — Build image, push to ECR, apply Terraform
# Usage: ./infra/deploy.ps1
param(
  [string]$ImageTag = "latest"
)

$ErrorActionPreference = "Stop"
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")

$Region  = "eu-west-1"
$Project = "wholesale-crm"

# ── 0. Secrets from environment ───────────────────────────────────────────────
if (-not $env:MONGODB_URI) { throw "Set MONGODB_URI environment variable first" }
if (-not $env:JWT_SECRET)  { throw "Set JWT_SECRET environment variable first"  }

# ── 1. Terraform init + plan ──────────────────────────────────────────────────
Write-Host "`n[1/5] Terraform init..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot"
terraform init -upgrade

Write-Host "`n[2/5] Terraform apply (VPC, ECR, SSM)..." -ForegroundColor Cyan
terraform apply -auto-approve `
  -var "mongodb_uri=$($env:MONGODB_URI)" `
  -var "jwt_secret=$($env:JWT_SECRET)"

# ── 2. Get ECR URL ────────────────────────────────────────────────────────────
$EcrUrl = (terraform output -raw ecr_repo_url)
Write-Host "`nECR: $EcrUrl" -ForegroundColor Green

# ── 3. Build + push Docker image ─────────────────────────────────────────────
Write-Host "`n[3/5] Logging in to ECR..." -ForegroundColor Cyan
aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $EcrUrl

Write-Host "`n[4/5] Building Docker image..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\.."
docker build -t "${Project}:${ImageTag}" .
docker tag "${Project}:${ImageTag}" "${EcrUrl}:${ImageTag}"

Write-Host "Pushing to ECR..." -ForegroundColor Cyan
docker push "${EcrUrl}:${ImageTag}"

# ── 4. Force new ECS deployment ───────────────────────────────────────────────
Write-Host "`n[5/5] Forcing new ECS deployment..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot"
$Cluster = (terraform output -raw ecs_cluster)
$Service = (terraform output -raw ecs_service)
aws ecs update-service --cluster $Cluster --service $Service --force-new-deployment --region $Region | Out-Null

Write-Host "`nWaiting for service to stabilise (up to 5 min)..." -ForegroundColor Yellow
aws ecs wait services-stable --cluster $Cluster --services $Service --region $Region

$AlbUrl = (terraform output -raw alb_url)
$NatIp  = (terraform output -raw nat_gateway_ip)

Write-Host "`n✅ Deployment complete!" -ForegroundColor Green
Write-Host "   ALB URL   : $AlbUrl" -ForegroundColor Green
Write-Host "   NAT IP    : $NatIp  ← add to MongoDB Atlas Network Access" -ForegroundColor Yellow
Write-Host "`nTesting /health..."
curl.exe -s "$AlbUrl/health"
