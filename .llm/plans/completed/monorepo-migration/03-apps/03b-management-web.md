# Plan 3b: management-web Migration

## Overview

Migrate `podverse-management-web` to `apps/management-web/` in the monorepo.

**Estimated time**: 2-3 hours

---

## Step 1: Copy Source Files

Copy all source and supporting files:

```bash
# From monorepo root
cp -r ../podverse-management-web/src apps/management-web/
cp -r ../podverse-management-web/i18n apps/management-web/
cp -r ../podverse-management-web/scripts apps/management-web/
cp -r ../podverse-management-web/public apps/management-web/
```

**Source structure:**

- `src/app/` - Next.js app router pages
- `src/components/` - React components (Head, ui/)
- `src/config/` - Configuration
- `src/i18n/` - next-intl request config
- `src/lib/requests/` - API request utilities
- `src/providers/` - React context providers
- `src/styles/` - SCSS stylesheets

**Supporting files:**

- `i18n/originals/` - Original translation files
- `i18n/overrides/` - Override translations
- `i18n/compiled/` - Compiled output (generated)
- `scripts/i18n/` - Translation compilation scripts
- `scripts/validate-env.ts` - Environment validation
- `public/favicon/` - Favicon assets

---

## Step 2: Copy Next.js Configuration Files

```bash
cp ../podverse-management-web/next.config.ts apps/management-web/
cp ../podverse-management-web/next-intl.config.js apps/management-web/
cp ../podverse-management-web/next-env.d.ts apps/management-web/
```

---

## Step 3: Create package.json

Create `apps/management-web/package.json`:

```json
{
  "name": "@podverse/management-web",
  "version": "5.2.0",
  "description": "Administrative management interface for Podverse",
  "private": true,
  "scripts": {
    "prebuild": "npm run validate-env && npm run i18n-compile",
    "build": "next build",
    "predev": "npm run validate-env && npm run i18n-compile",
    "dev": "next dev -p 3999",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "start": "next start",
    "clean": "rm -rf .next",
    "validate-env": "ts-node --project tsconfig.scripts.json scripts/validate-env.ts",
    "i18n-compile": "ts-node --project tsconfig.scripts.json scripts/i18n/i18n-compile.ts",
    "i18n-llm-translations": "ts-node --project tsconfig.scripts.json scripts/i18n/i18n-llm-translations.ts"
  },
  "license": "AGPL-3.0",
  "dependencies": {
    "@hello-pangea/dnd": "^18.0.1",
    "@podverse/helpers": "*",
    "axios": "^1.12.2",
    "classnames": "^2.5.1",
    "isomorphic-dompurify": "^2.28.0",
    "next": "^15.5.7",
    "next-intl": "^4.3.9",
    "react": "^19.2.1",
    "react-dom": "^19.2.1",
    "react-hot-toast": "^2.6.0",
    "react-icons": "^5.5.0",
    "react-markdown": "^10.1.0",
    "react-virtuoso": "^4.14.1",
    "sass": "^1.92.1",
    "sharp": "^0.34.5",
    "transcriptator": "^1.1.4",
    "uuid": "^13.0.0",
    "video.js": "^8.23.4",
    "zod": "^3.25.76"
  },
  "devDependencies": {
    "@types/node": "^24.4.0",
    "@types/react": "^19.1.13",
    "@types/react-dom": "^19.2.2",
    "@types/video.js": "^7.3.58",
    "dotenv": "^17.2.2",
    "nodemon": "^3.1.10",
    "openai": "^5.20.3",
    "ts-node": "^10.9.2",
    "typescript": "^5.9.2"
  }
}
```

---

## Step 4: Create TypeScript Configs

**Create `apps/management-web/tsconfig.json`:**

```json
{
  "compilerOptions": {
    "target": "es6",
    "lib": ["dom", "dom.iterable", "esnext"],
    "skipLibCheck": true,
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "allowJs": true,
    "plugins": [
      {
        "name": "next"
      }
    ]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "next-env.d.ts", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Create `apps/management-web/tsconfig.scripts.json`:**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "es2022",
    "lib": ["es2022"],
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["scripts/**/*.ts"]
}
```

---

## Step 5: Update Imports

Update `scripts/validate-env.ts` to use workspace package:

```typescript
// Before
import {
  ValidationResult,
  ValidationSummary,
  validateRequired,
  validateOptional,
  getAllAvailableOrListMessage,
  validateSupportedLocalesList,
  validateLocale,
} from 'podverse-helpers';

// After
import {
  ValidationResult,
  ValidationSummary,
  validateRequired,
  validateOptional,
  getAllAvailableOrListMessage,
  validateSupportedLocalesList,
  validateLocale,
} from '@podverse/helpers';
```

---

## Step 6: Copy Documentation

```bash
cp ../podverse-management-web/ENV.md apps/management-web/
```

---

## Step 7: Verify Build and Dev Server

```bash
# From monorepo root

# Install dependencies
npm install

# Build packages first (if not already built)
npm run build:packages

# Run i18n compilation
npm run i18n-compile -w apps/management-web

# Start dev server (requires .env file)
npm run dev:management-web

# Build for production
npm run build -w apps/management-web
```

---

## Verification Checklist

- [ ] All source files copied to `apps/management-web/src/`
- [ ] i18n files copied to `apps/management-web/i18n/`
- [ ] Scripts copied to `apps/management-web/scripts/`
- [ ] Public assets copied to `apps/management-web/public/`
- [ ] Next.js configs copied (`next.config.ts`, `next-intl.config.js`, `next-env.d.ts`)
- [ ] `package.json` created with workspace dependencies
- [ ] `tsconfig.json` configured for Next.js
- [ ] `tsconfig.scripts.json` configured for build scripts
- [ ] Imports updated to use `@podverse/helpers`
- [ ] i18n compilation works: `npm run i18n-compile -w apps/management-web`
- [ ] Dev server starts: `npm run dev:management-web`
- [ ] Production build succeeds: `npm run build -w apps/management-web`

---

## Files Structure After Migration

```
apps/management-web/
├── ENV.md
├── next-env.d.ts
├── next-intl.config.js
├── next.config.ts
├── package.json
├── tsconfig.json
├── tsconfig.scripts.json
├── i18n/
│   ├── compiled/
│   ├── originals/
│   │   ├── el-GR.json
│   │   ├── en-US.json
│   │   ├── es.json
│   │   └── fr.json
│   └── overrides/
├── public/
│   └── favicon/
├── scripts/
│   ├── i18n/
│   │   ├── i18n-compile.ts
│   │   └── i18n-llm-translations.ts
│   └── validate-env.ts
└── src/
    ├── app/
    │   ├── dashboard/
    │   ├── layout.tsx
    │   └── page.tsx
    ├── components/
    │   ├── Head/
    │   └── ui/
    ├── config/
    │   └── index.ts
    ├── i18n/
    │   └── request.ts
    ├── lib/
    │   └── requests/
    ├── providers/
    │   └── Providers.tsx
    └── styles/
        ├── components/
        ├── index.scss
        └── theme/
```

---

## Next

Proceed to [03c-workers.md](03c-workers.md)
