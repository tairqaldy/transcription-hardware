# Vercel Deployment Script for PowerShell
# This script helps deploy the frontend to Vercel

$ErrorActionPreference = "Stop"

Write-Host "?? Starting Vercel deployment..." -ForegroundColor Cyan

# Check if Vercel CLI is installed
try {
    $null = Get-Command vercel -ErrorAction Stop
    Write-Host "? Vercel CLI is installed" -ForegroundColor Green
} catch {
    Write-Host "? Vercel CLI is not installed." -ForegroundColor Red
    Write-Host "?? Installing Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel
}

# Check if user is logged in
try {
    $null = vercel whoami 2>&1
    Write-Host "? Logged in to Vercel" -ForegroundColor Green
} catch {
    Write-Host "?? Please login to Vercel..." -ForegroundColor Yellow
    vercel login
}

# Check environment variables
Write-Host "?? Checking environment variables..." -ForegroundColor Cyan
$envVarsSet = $true
if (-not $env:VITE_SUPABASE_URL) {
    Write-Host "??  Warning: VITE_SUPABASE_URL is not set locally" -ForegroundColor Yellow
    $envVarsSet = $false
}
if (-not $env:VITE_SUPABASE_ANON_KEY) {
    Write-Host "??  Warning: VITE_SUPABASE_ANON_KEY is not set locally" -ForegroundColor Yellow
    $envVarsSet = $false
}

if (-not $envVarsSet) {
    Write-Host ""
    Write-Host "??  Make sure to set environment variables in Vercel dashboard:" -ForegroundColor Yellow
    Write-Host "   - VITE_SUPABASE_URL" -ForegroundColor Yellow
    Write-Host "   - VITE_SUPABASE_ANON_KEY" -ForegroundColor Yellow
    Write-Host ""
}

# Build the project first
Write-Host "?? Building project..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "? Build failed!" -ForegroundColor Red
    exit 1
}

# Deploy to Vercel
Write-Host "?? Deploying to Vercel..." -ForegroundColor Cyan
if ($args[0] -eq "--prod") {
    vercel --prod
} else {
    Write-Host "   Deploying as preview (use --prod for production)..." -ForegroundColor Yellow
    vercel
}

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "? Deployment complete!" -ForegroundColor Green
    Write-Host "?? Don't forget to set environment variables in Vercel dashboard if you haven't already." -ForegroundColor Yellow
} else {
    Write-Host "? Deployment failed!" -ForegroundColor Red
    exit 1
}
