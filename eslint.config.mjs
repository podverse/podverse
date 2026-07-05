import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import { dirname } from 'path';
import tseslint from 'typescript-eslint';
import { fileURLToPath } from 'url';

import requireRelativeJsExtension from './eslint-rules/require-relative-js-extension.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
      parserOptions: {
        tsconfigRootDir: __dirname,
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
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports',
          disallowTypeAnnotations: false,
        },
      ],
    },
  },
  {
    files: ['tools/**/*.{ts,tsx,js,mjs,cjs}', 'scripts/**/*.{ts,mjs,mts}'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^node:'],
            ['^(?!@podverse/)[@a-zA-Z0-9]'],
            ['^@podverse/'],
            ['^\\.'],
            ['^.+\\.(css|scss|sass)$'],
          ],
        },
      ],
    },
  },
  {
    files: ['**/apps/management-web/src/app/layout.tsx'],
    rules: {
      'simple-import-sort/imports': 'off',
    },
  },
  {
    files: [
      'packages/**/*.{ts,tsx}',
      'apps/api/**/*.{ts,tsx}',
      'apps/management-api/**/*.{ts,tsx}',
      'apps/workers/**/*.{ts,tsx}',
      'apps/web/sidecar/**/*.{ts,tsx}',
      'apps/management-web/sidecar/**/*.{ts,tsx}',
      'tools/**/*.{ts,tsx}',
      'scripts/**/*.{ts,mts}',
    ],
    plugins: {
      nodeNextRelativeImports: {
        rules: {
          'require-relative-js-extension': requireRelativeJsExtension,
        },
      },
    },
    rules: {
      'nodeNextRelativeImports/require-relative-js-extension': 'error',
    },
  },
  {
    files: ['packages/ui/**/*.{ts,tsx}', 'packages/integrations-web/**/*.{ts,tsx}'],
    rules: {
      'nodeNextRelativeImports/require-relative-js-extension': 'off',
    },
  },
  {
    files: [
      'apps/web/src/**/*.{ts,tsx}',
      'apps/management-web/src/**/*.{ts,tsx}',
      'apps/web/e2e/**/*.{ts,tsx}',
      'apps/management-web/e2e/**/*.{ts,tsx}',
    ],
    plugins: {
      nodeNextRelativeImports: {
        rules: {
          'require-relative-js-extension': requireRelativeJsExtension,
        },
      },
    },
    rules: {
      'nodeNextRelativeImports/require-relative-js-extension': 'off',
    },
  },
  {
    files: ['apps/mobile/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        __DEV__: 'readonly',
        ErrorUtils: 'readonly',
        FormData: 'readonly',
        XMLHttpRequest: 'readonly',
        alert: 'readonly',
        cancelAnimationFrame: 'readonly',
        fetch: 'readonly',
        navigator: 'readonly',
        requestAnimationFrame: 'readonly',
      },
    },
    plugins: {
      nodeNextRelativeImports: {
        rules: {
          'require-relative-js-extension': requireRelativeJsExtension,
        },
      },
    },
    rules: {
      'nodeNextRelativeImports/require-relative-js-extension': 'off',
    },
  },
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.next/**',
      '**/*.js',
      '**/*.d.ts',
      '**/.llm/plans/**',
      '**/*.md',
      '**/*.mdc',
    ],
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    ignores: [
      'apps/web/src/hooks/useMediaElementBridge.ts',
      'apps/web/src/hooks/mediaElementBridgeSurface.ts',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'AssignmentExpression > MemberExpression[object.type="MemberExpression"][object.object.name="mediaRef"][object.property.name="current"]',
          message:
            'Do not assign through mediaRef.current here; only useMediaElementBridge may mutate the mounted media element (see .cursor/skills/media-player-architecture/SKILL.md).',
        },
        {
          selector:
            'CallExpression[callee.type="MemberExpression"][callee.object.type="MemberExpression"][callee.object.object.name="mediaRef"][callee.object.property.name="current"][callee.property.name="load"]',
          message:
            'Do not call mediaRef.current.load() here; only useMediaElementBridge may call load().',
        },
        {
          selector:
            'CallExpression[callee.type="MemberExpression"][callee.object.type="MemberExpression"][callee.object.object.name="mediaRef"][callee.object.property.name="current"][callee.property.name="play"]',
          message:
            'Do not call mediaRef.current.play() here; only useMediaElementBridge may call play().',
        },
        {
          selector:
            'CallExpression[callee.type="MemberExpression"][callee.object.type="MemberExpression"][callee.object.object.name="mediaRef"][callee.object.property.name="current"][callee.property.name="pause"]',
          message:
            'Do not call mediaRef.current.pause() here; only useMediaElementBridge may call pause().',
        },
        {
          selector:
            'CallExpression[callee.type="MemberExpression"][callee.object.type="MemberExpression"][callee.object.object.name="mediaRef"][callee.object.property.name="current"][callee.property.name="removeAttribute"]',
          message:
            'Do not call mediaRef.current.removeAttribute() here; only useMediaElementBridge may do that.',
        },
      ],
    },
  },
  eslintConfigPrettier,
  {
    rules: {
      semi: ['error', 'always'],
    },
  }
);
