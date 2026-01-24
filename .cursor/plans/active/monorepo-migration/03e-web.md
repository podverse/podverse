# Plan 3e: web Migration

## Overview

Migrate `podverse-web` to `apps/web/` in the monorepo. This is the most complex application with 285 components, 229 SCSS files, i18n support, and a video player.

**Estimated time**: 4-6 hours

---

## Step 1: Copy Source Files

Copy all source and supporting files:

```bash
# From monorepo root
cp -r ../podverse-web/src apps/web/
cp -r ../podverse-web/i18n apps/web/
cp -r ../podverse-web/scripts apps/web/
cp -r ../podverse-web/public apps/web/
```

**Source structure:**
- `src/app/` - Next.js App Router pages (50+ page directories)
- `src/components/` - React components (285 files)
  - `Auth/`, `Head/`, `MediaPlayer/`, `NavBar/`, `SideBar/`, etc.
- `src/config/` - Configuration
- `src/constants/` - App constants
- `src/contexts/` - React contexts (13 files)
  - Account, AutoQueue, Categories, LocalSettings, MediaPlayer, etc.
- `src/factories/` - Service factories
- `src/hooks/` - Custom hooks (14 files)
- `src/i18n/` - next-intl request config
- `src/lib/notifications/` - Push notification utilities
- `src/providers/` - React context providers
- `src/requests/` - API request utilities
- `src/styles/` - SCSS stylesheets (229 files)
- `src/utils/` - Utility functions (27 files)

**Supporting files:**
- `i18n/originals/` - Original translation files (el-GR, en-US, es, fr)
- `i18n/overrides/` - Override translations
- `i18n/compiled/` - Compiled output (generated)
- `scripts/i18n/` - Translation compilation scripts
- `scripts/validate-env.ts` - Environment validation
- `public/branding/` - Brand assets
- `public/favicon/` - Favicon assets
- `public/fonts/` - Font files (Roboto)
- `public/images/` - Static images
- `public/webpush-sw.js` - Service worker for push notifications

---

## Step 2: Copy Next.js Configuration Files

```bash
cp ../podverse-web/next.config.ts apps/web/
cp ../podverse-web/next-intl.config.js apps/web/
cp ../podverse-web/next-env.d.ts apps/web/
```

---

## Step 3: Create package.json

Create `apps/web/package.json`:

```json
{
  "name": "@podverse/web",
  "version": "5.2.0",
  "description": "Website for the Podverse podcast app",
  "private": true,
  "scripts": {
    "prebuild": "npm run validate-env && npm run i18n-compile",
    "build": "next build",
    "predev": "npm run validate-env && npm run i18n-compile",
    "dev": "next dev",
    "dev:watch": "nodemon",
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
    "@next/bundle-analyzer": "^15.1.6",
    "@types/node": "^24.4.0",
    "@types/react": "^19.1.13",
    "@types/react-dom": "^19.2.2",
    "@types/video.js": "^7.3.58",
    "axios": "^1.12.2",
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

**Create `apps/web/tsconfig.json`:**

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
  "include": [
    "src/**/*.ts",
    "src/**/*.tsx",
    "next-env.d.ts",
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

**Create `apps/web/tsconfig.scripts.json`:**

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

Update imports to use workspace packages:

**In `src/app/layout.tsx`:**
```typescript
// Before
import { generateQueueResourceAbridgedIndex, QueueResourcesAbridgedIndex } from 'podverse-helpers';

// After
import { generateQueueResourceAbridgedIndex, QueueResourcesAbridgedIndex } from '@podverse/helpers';
```

**In `scripts/validate-env.ts`:**
```typescript
// Before
import { ValidationResult, ValidationSummary, validateRequired, validateOptional, getAllAvailableOrListMessage, validateSupportedLocalesList, validateLocale, SERVER_ENV_VALUES, isValidServerEnv } from 'podverse-helpers';

// After
import { ValidationResult, ValidationSummary, validateRequired, validateOptional, getAllAvailableOrListMessage, validateSupportedLocalesList, validateLocale, SERVER_ENV_VALUES, isValidServerEnv } from '@podverse/helpers';
```

**Search and replace across all files:**
- `from 'podverse-helpers'` → `from '@podverse/helpers'`

---

## Step 6: Copy Documentation and Additional Files

```bash
cp ../podverse-web/ENV.md apps/web/
cp ../podverse-web/nodemon.json apps/web/
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
npm run i18n-compile -w apps/web

# Start dev server (requires .env file)
npm run dev:web

# Build for production
npm run build -w apps/web
```

---

## Verification Checklist

- [ ] All source files copied to `apps/web/src/`
- [ ] i18n files copied to `apps/web/i18n/`
- [ ] Scripts copied to `apps/web/scripts/`
- [ ] Public assets copied to `apps/web/public/`
- [ ] Next.js configs copied (`next.config.ts`, `next-intl.config.js`, `next-env.d.ts`)
- [ ] `package.json` created with workspace dependencies
- [ ] `tsconfig.json` configured for Next.js
- [ ] `tsconfig.scripts.json` configured for build scripts
- [ ] Imports updated to use `@podverse/helpers`
- [ ] i18n compilation works: `npm run i18n-compile -w apps/web`
- [ ] Environment validation works: `npm run validate-env -w apps/web`
- [ ] Dev server starts: `npm run dev:web`
- [ ] Production build succeeds: `npm run build -w apps/web`
- [ ] Video.js player loads correctly
- [ ] SCSS styles compile correctly
- [ ] Push notification service worker loads

---

## Key Features to Verify

| Feature | Files | Verification |
|---------|-------|--------------|
| i18n | `i18n/`, `src/i18n/` | Multiple languages load correctly |
| Media Player | `src/components/MediaPlayer/` | Audio/video playback works |
| Themes | `src/styles/`, `src/utils/localSettings/` | Dark/light/dracula themes switch |
| Authentication | `src/utils/auth/`, `src/components/Auth/` | Login/logout works |
| Push Notifications | `public/webpush-sw.js`, `src/lib/notifications/` | Service worker registers |
| SSR | `src/app/layout.tsx` | Server-side data fetching works |
| Contexts | `src/contexts/` | State management works |

---

## Files Structure After Migration

```
apps/web/
├── ENV.md
├── next-env.d.ts
├── next-intl.config.js
├── next.config.ts
├── nodemon.json
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
│   ├── branding/
│   ├── favicon/
│   ├── fonts/
│   ├── images/
│   └── webpush-sw.js
├── scripts/
│   ├── i18n/
│   │   ├── i18n-compile.ts
│   │   └── i18n-llm-translations.ts
│   └── validate-env.ts
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── about/
    │   ├── album/
    │   ├── albums/
    │   ├── artist/
    │   ├── artists/
    │   ├── chapter/
    │   ├── checkout/
    │   ├── clip/
    │   ├── clips/
    │   ├── contact/
    │   ├── donate/
    │   ├── episode/
    │   ├── episodes/
    │   ├── history/
    │   ├── membership/
    │   ├── mobile-app/
    │   ├── music/
    │   ├── my-clips/
    │   ├── my-profile/
    │   ├── playlist/
    │   ├── playlists/
    │   ├── podcast/
    │   ├── podcasts/
    │   ├── profile/
    │   ├── profiles/
    │   ├── queues/
    │   ├── search/
    │   ├── settings/
    │   ├── sign-up/
    │   ├── track/
    │   ├── tracks/
    │   └── [more pages...]
    ├── components/
    │   └── [285 component files]
    ├── config/
    │   └── index.ts
    ├── constants/
    │   └── [constant files]
    ├── contexts/
    │   └── [13 context files]
    ├── factories/
    │   └── apiRequestService.ts
    ├── hooks/
    │   └── [14 hook files]
    ├── i18n/
    │   └── request.ts
    ├── lib/
    │   └── notifications/
    ├── providers/
    │   └── Providers.tsx
    ├── requests/
    │   └── api/
    ├── styles/
    │   └── [229 SCSS files]
    └── utils/
        └── [27 utility files]
```

---

## Next

Proceed to [03f-integration.md](03f-integration.md)
