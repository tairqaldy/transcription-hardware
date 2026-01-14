# Vercel Deployment Guide

This guide will help you deploy the frontend application to Vercel.

## Prerequisites

1. A Vercel account ([sign up here](https://vercel.com/signup))
2. Vercel CLI installed (optional, for CLI deployment):
   ```bash
   npm install -g vercel
   ```

## Environment Variables

Before deploying, make sure to set the following environment variables in your Vercel project settings:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** ? **Environment Variables**
3. Add the following variables:

   - `VITE_SUPABASE_URL` - Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

   **Important**: These must be prefixed with `VITE_` for Vite to expose them to the client-side code.

## Deployment Methods

### Method 1: GitHub Integration (Recommended)

1. Push your code to a GitHub repository
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click **Add New Project**
4. Import your GitHub repository
5. Vercel will automatically detect the project settings from `vercel.json`
6. Add your environment variables in the project settings
7. Click **Deploy**

### Method 2: Vercel CLI

1. Install Vercel CLI (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Navigate to the frontend directory:
   ```bash
   cd application/frontend
   ```

4. Deploy:
   ```bash
   vercel
   ```

5. For production deployment:
   ```bash
   vercel --prod
   ```

### Method 3: Using the Deployment Script

Run the deployment script:
```bash
npm run deploy
```

## Configuration Files

### `vercel.json`

The main Vercel configuration file includes:
- **Build Command**: `npm run build`
- **Output Directory**: `dist` (Vite's default output)
- **SPA Routing**: All routes are rewritten to `/index.html` for client-side routing
- **Security Headers**: XSS protection, frame options, content type options
- **Asset Caching**: Long-term caching for static assets

### `.vercelignore`

Specifies files and directories to exclude from deployment.

## Post-Deployment

After deployment:

1. **Verify Environment Variables**: Ensure all environment variables are set correctly
2. **Test Routes**: Test all application routes to ensure client-side routing works
3. **Check Console**: Verify no errors in the browser console
4. **Test Supabase Connection**: Ensure Supabase client is connecting properly

## Troubleshooting

### Build Fails

- Check that all dependencies are listed in `package.json`
- Verify Node.js version compatibility (Vercel uses Node.js 18.x by default)
- Check build logs in Vercel dashboard

### Environment Variables Not Working

- Ensure variables are prefixed with `VITE_`
- Redeploy after adding/changing environment variables
- Check that variables are set for the correct environment (Production, Preview, Development)

### Routing Issues

- Verify `vercel.json` includes the rewrite rule for SPA routing
- Check that React Router is configured correctly
- Ensure all routes are accessible

### 404 Errors on Refresh

- This is handled by the rewrite rule in `vercel.json`
- If issues persist, verify the rewrite configuration

## Custom Domain

To add a custom domain:

1. Go to your project in Vercel dashboard
2. Navigate to **Settings** ? **Domains**
3. Add your custom domain
4. Follow DNS configuration instructions

## Continuous Deployment

With GitHub integration, Vercel automatically deploys:
- **Production**: On push to main/master branch
- **Preview**: On push to other branches or pull requests

Each deployment gets a unique URL for preview deployments.
