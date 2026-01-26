# Fix Web App CSS 404 Errors

## Problem

The web app is running and serving pages at `localhost:3000`, but all CSS files return 404 errors. The HTML is loading but stylesheets are not being found.

## Root Cause Analysis

The issue is likely related to how Next.js standalone builds handle static files when using `outputFileTracingRoot` in a monorepo structure.

Current Dockerfile structure:
- Copies `.next/standalone` to `/opt/app/`
- Copies `.next/static` to `/opt/app/.next/static` (separate COPY command)
- Runs `node apps/web/server.js`

With `outputFileTracingRoot: path.join(__dirname, '../../')` in `next.config.ts`, the standalone build structure includes:
- `apps/web/server.js` (the server entry point)
- Static files should be relative to where the server runs

The problem: When the server runs from `apps/web/server.js`, it looks for static files relative to its location. However, we're copying static files to `/opt/app/.next/static`, which might not match where the server expects them.

## Potential Solutions

### Option 1: Static files are already in standalone (most likely)

Next.js standalone builds include static files within the standalone directory. We might be copying them twice or to the wrong location. The static files might already be at `/opt/app/apps/web/.next/static` within the standalone build.

**Solution**: Remove the separate `.next/static` COPY command and ensure static files are in the correct location within the standalone build.

### Option 2: Static files need to be at the server's relative path

If the server runs from `apps/web/server.js`, it might expect static files at `apps/web/.next/static` relative to the standalone root.

**Solution**: Copy static files to match the server's expected path structure.

### Option 3: Static files path mismatch

The standalone build might have static files at a different path than expected.

**Solution**: Verify the actual structure of the standalone build and adjust COPY commands accordingly.

## Investigation Steps

1. Check the actual structure of `.next/standalone` after build to see where static files are located
2. Verify if static files are already included in the standalone directory
3. Check Next.js documentation for `outputFileTracingRoot` behavior with static files
4. Test if removing the separate static COPY command fixes the issue

## Files to Modify

1. **`apps/web/Dockerfile`** - Adjust static file COPY commands based on investigation

## Implementation

Based on Next.js standalone build behavior with `outputFileTracingRoot`, the most likely fix is:

1. **Remove the separate static COPY** - Static files should already be in the standalone build
2. **OR adjust the static path** - Copy to `apps/web/.next/static` to match server.js location

The fix will depend on the actual structure of the standalone build output.

## Testing

After fixing, verify:
- CSS files load correctly (check browser Network tab)
- All static assets (JS, CSS, images) are accessible
- Page renders with proper styling
