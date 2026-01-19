# Vercel Deployment Guide

## Overview

This guide explains how to deploy the frontend to Vercel when you have code/logic in folders outside the frontend directory.

## Problem

By default, if you configure Vercel to deploy only the `application/frontend` folder, it won't have access to files outside that folder during the build process. This means:
- ❌ Cannot import from root `src/` folder
- ❌ Cannot access shared utilities outside frontend
- ❌ Cannot reference backend types or schemas

## Solution: Deploy from Project Root

We've configured Vercel to deploy from the **project root** (`fontys-projects/project-5-feedpulse-ai/`) while building the frontend. This gives you access to all files in the project.

### Configuration Files

1. **Root `vercel.json`**: Configures Vercel to use the project root
2. **Updated `vite.config.ts`**: Added path aliases to import from root `src/` folder
3. **Updated `tsconfig.app.json`**: Added TypeScript path mappings

### Vercel Dashboard Configuration

In your Vercel project settings:

1. **Root Directory**: Set to project root (or leave empty if using root `vercel.json`)
   - Path: `fontys-projects/project-5-feedpulse-ai/`

2. **Build Command**: (Already in `vercel.json`)
   ```
   cd application/frontend && npm install && npm run build
   ```

3. **Output Directory**: (Already in `vercel.json`)
   ```
   application/frontend/dist
   ```

4. **Install Command**: (Already in `vercel.json`)
   ```
   cd application/frontend && npm install
   ```

### Using Path Aliases

You can now import from the root `src/` folder using the `@root` alias:

```typescript
// Import from root src folder
import { SomeComponent } from '@root/components/SomeComponent'
import { SomeUtil } from '@root/utils/someUtil'

// Import from frontend src folder (existing)
import { Dashboard } from '@/components/Dashboard'
```

### Alternative: Import with Relative Paths

You can also use relative paths (though aliases are cleaner):

```typescript
// From frontend/src/components/MyComponent.tsx
import { Something } from '../../../src/components/Something'
```

## Important Notes

1. **Build Context**: The build runs from the project root, so all files are accessible
2. **Dependencies**: Only `application/frontend/package.json` dependencies are installed
3. **Output**: The built files are in `application/frontend/dist/`
4. **Environment Variables**: Set in Vercel dashboard under Project Settings → Environment Variables

## Troubleshooting

### Build Fails with "Cannot find module"

- Check that the file exists in the root `src/` folder
- Verify path aliases in `vite.config.ts` and `tsconfig.app.json`
- Ensure the file is not in `.gitignore`

### Vercel Still Deploys from Frontend Folder

- Check Vercel dashboard: Settings → General → Root Directory
- Ensure root `vercel.json` exists and is committed
- Try redeploying after updating settings

### TypeScript Errors

- Restart your TypeScript server in your IDE
- Run `npm run build` locally to verify paths work
- Check `tsconfig.app.json` path mappings

## Migration Steps

If you're currently deploying only the frontend folder:

1. ✅ Root `vercel.json` has been created
2. ✅ Vite config updated with path aliases
3. ✅ TypeScript config updated with path mappings
4. ⚠️ **Update Vercel Dashboard**: 
   - Go to your project settings
   - Set Root Directory to project root (or leave empty)
   - Verify build/output commands match `vercel.json`
5. ⚠️ **Test locally**: Run `cd application/frontend && npm run build`
6. ⚠️ **Redeploy**: Push changes and trigger a new deployment

## Best Practices

1. **Prefer Frontend Folder**: Keep most code in `application/frontend/src/`
2. **Shared Code**: Only put truly shared code in root `src/` (if needed)
3. **Type Safety**: Use TypeScript path aliases instead of relative paths
4. **Documentation**: Document any shared code dependencies

## Questions?

If you encounter issues:
1. Check Vercel build logs for specific errors
2. Verify file paths and aliases are correct
3. Test build locally first: `cd application/frontend && npm run build`
