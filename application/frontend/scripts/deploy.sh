#!/bin/bash

# Vercel Deployment Script
# This script helps deploy the frontend to Vercel

set -e

echo "?? Starting Vercel deployment..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "? Vercel CLI is not installed."
    echo "?? Installing Vercel CLI..."
    npm install -g vercel
fi

# Check if user is logged in
if ! vercel whoami &> /dev/null; then
    echo "?? Please login to Vercel..."
    vercel login
fi

# Check environment variables
echo "?? Checking environment variables..."
if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    echo "??  Warning: Environment variables may not be set."
    echo "   Make sure to set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel dashboard."
    echo ""
fi

# Build the project first
echo "?? Building project..."
npm run build

# Deploy to Vercel
echo "?? Deploying to Vercel..."
if [ "$1" == "--prod" ]; then
    vercel --prod
else
    echo "   Deploying as preview (use --prod for production)..."
    vercel
fi

echo "? Deployment complete!"
echo "?? Don't forget to set environment variables in Vercel dashboard if you haven't already."
