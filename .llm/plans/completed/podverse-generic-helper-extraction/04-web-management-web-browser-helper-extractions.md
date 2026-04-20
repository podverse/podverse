# Podverse Generic Helper Extraction - 04 Web Management Web Browser

## Scope
Extract duplicated browser-only helper logic in `apps/web` and `apps/management-web` into `@podverse/helpers-browser`.

## Primary Files
- `apps/web/src/components/Head/RuntimeConfigScript.tsx`
- `apps/management-web/src/components/Head/RuntimeConfigScript.tsx`
- `apps/web/src/lib/notifications/webpush/requestNotificationPermission.ts`
- Browser helper exports in `packages/helpers-browser/src/index.ts`

## Extraction Mapping

### 1) Runtime config script helpers
Current duplicated logic in both web apps:
- `serializeRuntimeConfig`
- `buildRuntimeConfigScript`

Action:
- Move both helpers to `@podverse/helpers-browser`.
- Replace local function declarations in both components with imports.

### 2) Web push VAPID conversion
Current local helper:
- `urlBase64ToUint8Array`

Action:
- Move helper to `@podverse/helpers-browser`.
- Replace local definition with import.

## Detailed Steps
1. Add browser helper modules for runtime config serialization and base64 conversion.
2. Export from `packages/helpers-browser/src/index.ts`.
3. Update web and management-web call sites.
4. Remove duplicated local helper declarations.

## Risks
- Runtime config script serialization must preserve safe escaping (`<` to `\\u003c`) to avoid XSS regressions.
- Do not introduce Node-only dependencies into browser helpers.
- Ensure tree-shaking remains acceptable (small focused exports).

## Acceptance Criteria
- Web and management-web runtime config components import shared helpers.
- Web push code imports shared base64 conversion helper.
- Local duplicate helper declarations removed.

## Verification
Run from monorepo root:

```bash
npm run build -w packages/helpers-browser
```

```bash
npm run build -w apps/web
```

```bash
npm run build -w apps/management-web
```

```bash
npm run lint -w apps/web && npm run lint -w apps/management-web
```
