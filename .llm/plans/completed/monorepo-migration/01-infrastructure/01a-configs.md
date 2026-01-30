# Plan 1a: Directory Structure and Core Configs

## Overview

Create the monorepo directory structure and essential configuration files.

**Estimated time**: 30-45 minutes

---

## Step 1: Create Directory Structure

```bash
mkdir -p .cursor/rules
mkdir -p .cursor/skills/{global,web,api,orm}
mkdir -p .github/workflows
mkdir -p .llm/history/{active,completed}
mkdir -p .llm/{context,templates}
mkdir -p apps/{api,web,workers,management-api,management-web}
mkdir -p docs/modules
mkdir -p infra/config/{env-templates,google}
mkdir -p infra/database/{migrations,seeds,init-scripts}
mkdir -p infra/docker/{local,alpha,sandbox,test}
mkdir -p infra/proxy
mkdir -p packages/{helpers,external-services,orm,notifications,parser,mq}
mkdir -p pipelines/jenkins/alpha
mkdir -p scripts/{dev,git-hooks,publish,keyvaldb,mq}
mkdir -p tools/qa
```

---

## Step 2: Create `.nvmrc`

```
22
```

---

## Step 3: Create `package.json`

```json
{
  "name": "podverse",
  "version": "5.2.0",
  "private": true,
  "description": "Podverse monorepo - podcast app infrastructure, modules, and applications",
  "repository": {
    "type": "git",
    "url": "https://github.com/podverse/podverse.git"
  },
  "contributors": ["Mitch Downey", "Creon Creonopoulos", "Archie Brentano", "Kyle Downey"],
  "license": "AGPL-3.0",
  "engines": {
    "node": ">=22.0.0"
  },
  "workspaces": ["packages/*", "apps/*", "tools/*"],
  "scripts": {
    "prepare": "bash scripts/git-hooks/install-hooks.sh",
    "build": "npm run build --workspaces --if-present",
    "build:packages": "npm run build -w packages/helpers && npm run build -w packages/external-services && npm run build -w packages/orm && npm run build -w packages/notifications && npm run build -w packages/parser && npm run build -w packages/mq",
    "build:apps": "npm run build --workspaces --if-present --workspace=apps/api --workspace=apps/web --workspace=apps/workers --workspace=apps/management-api --workspace=apps/management-web",
    "clean": "npm run clean --workspaces --if-present",
    "dev:api": "npm run dev -w apps/api",
    "dev:web": "npm run dev -w apps/web",
    "dev:management-api": "npm run dev -w apps/management-api",
    "dev:management-web": "npm run dev -w apps/management-web",
    "lint": "npm run lint --workspaces --if-present",
    "lint:fix": "npm run lint:fix --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "type-check": "npm run type-check --workspaces --if-present"
  }
}
```

---

## Step 4: Create `tsconfig.base.json`

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

---

## Step 5: Create `eslint.config.mjs`

```javascript
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      semi: ['error', 'never'],
      quotes: ['error', 'single', { avoidEscape: true }],
      'comma-dangle': ['error', 'always-multiline'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
    },
  },
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/*.js', '**/*.d.ts'],
  }
);
```

---

## Step 6: Create `.gitignore`

```gitignore
# Dependencies
node_modules/

# Build outputs
dist/
.next/
out/

# Environment files
.env
.env.local
.env.*.local
*.env
!*.env.example

# Logs
logs/
*.log
npm-debug.log*

# IDE
.idea/
*.swp
*.swo
.vscode/
!.vscode/settings.json
!.vscode/extensions.json

# OS
.DS_Store
Thumbs.db

# Test coverage
coverage/

# Misc
*.tgz
.cache/
```

---

## Checklist

- [ ] All directories created
- [ ] `.nvmrc` contains `22`
- [ ] `package.json` with workspaces config
- [ ] `tsconfig.base.json` with strict settings
- [ ] `eslint.config.mjs` with shared rules
- [ ] `.gitignore` configured

---

## Next

Proceed to [01b-git-hooks.md](01b-git-hooks.md)
