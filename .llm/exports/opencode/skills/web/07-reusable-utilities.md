# Reusable Utilities and podverse-helpers

## When to Put Utilities in podverse-helpers

**CRITICAL**: If a utility function could be useful in other Podverse applications (React Native mobile app, other Next.js apps, API services, etc.), it should be placed in the appropriate helper package, not in the web app.

**Helper Package Guide:**

- **`@podverse/helpers-validation`** (`packages/helpers-validation/`)
  - Email validation
  - Password validation
  - URL validation and SSRF protection
  - Form validation utilities
  - Database constants validation

- **`@podverse/helpers-requests`** (`packages/helpers-requests/`)
  - API request types and DTOs
  - Query params types and constants
  - ApiRequestService class
  - API resource request functions

- **`@podverse/helpers-backend`** (`packages/helpers-backend/`)
  - Logger utilities (Winston)
  - Timer utilities
  - OS/system utilities
  - Backend-specific helpers

- **`@podverse/helpers-browser`** (`packages/helpers-browser/`)
  - Clipboard utilities
  - Browser-specific DOM helpers
  - Web storage utilities

- **`@podverse/helpers-config`** (`packages/helpers-config/`)
  - Configuration validation
  - Startup validation utilities
  - Environment variable validation

- **`@podverse/helpers`** (`packages/helpers/`)
  - Core utilities, types, DTOs
  - Date/time formatting utilities
  - String manipulation helpers
  - Data transformation functions
  - Type guards and type checking utilities
  - Generic data processing functions
  - Medium constants and enums

**Examples of utilities that stay in apps/web:**

- Next.js-specific utilities (SSR helpers, Next.js API route helpers)
- React/Next.js component-specific utilities
- Web-specific UI utilities
- Next.js Image optimization helpers
- Web-only routing utilities

## Pattern: Moving Utilities to Helper Packages

1. **Identify reusable utilities**: Ask "Could this be useful in React Native or other apps?"
2. **Choose the appropriate helper package**:
   - **Validation** → `@podverse/helpers-validation`
   - **API/requests** → `@podverse/helpers-requests`
   - **Backend/logger** → `@podverse/helpers-backend`
   - **Browser/DOM** → `@podverse/helpers-browser`
   - **Config validation** → `@podverse/helpers-config`
   - **General utilities** → `@podverse/helpers`
3. **Place in appropriate location**:
   - Validation: `packages/helpers-validation/src/[filename].ts`
   - Requests: `packages/helpers-requests/src/api/[resource]/`
   - Backend: `packages/helpers-backend/src/[filename].ts`
   - Browser: `packages/helpers-browser/src/[filename].ts`
   - Config: `packages/helpers-config/src/[filename].ts`
   - General: `packages/helpers/src/lib/[category]/`
4. **Export from package**: Add to the package's index file
5. **Update web app**: Import from the appropriate `@podverse/helpers-*` package
6. **Keep app-specific wrappers**: If needed, create a thin wrapper in the web app that calls the helper function with app-specific defaults

## Example: SSRF Protection Utilities

```typescript
// ✅ Good: In packages/helpers-validation/src/url.ts
export function isPrivateIP(ip: string): boolean {
  // Reusable across all Podverse apps
}

export function isLocalhost(hostname: string): boolean {
  // Reusable across all Podverse apps
}

export function validateUrlForSSRF(url: string, options?: {...}): {...} {
  // Reusable SSRF validation with configurable options
}
```

```typescript
// ✅ Good: In apps/web/src/utils/proxy/urlValidator.ts
import { validateHttpOrHttpsUrl, validateUrlForSSRF } from '@podverse/helpers-validation';

// Thin wrapper with proxy-specific defaults
export function validateProxyUrl(url: string | null) {
  const urlValidation = validateHttpOrHttpsUrl(url);
  if (!urlValidation.isValid) return urlValidation;

  return validateUrlForSSRF(url, {
    allowPrivateIPs: false,
    allowLocalhost: false,
    allowedProtocols: ['http:', 'https:'],
  });
}
```

```typescript
// ❌ Bad: Keeping reusable utilities in apps/web
// apps/web/src/utils/proxy/urlValidator.ts
export function isPrivateIP(ip: string): boolean {
  // This should be in @podverse/helpers-validation!
}
```

## Key Points

- **Think cross-platform**: If it's useful in web, it's probably useful in mobile/API too
- **Security utilities are always reusable**: SSRF protection, input validation, etc.
- **Choose the right package**: Match the utility's purpose to the correct helper package
- **Keep app-specific logic separate**: Web-specific wrappers are fine, but core logic goes to helper packages
- **Check helper packages first**: Before creating a new utility, check if it already exists in one of the helper packages
- **Update imports**: When moving utilities, update all imports across the codebase
