# Subplan 30 - Web Apps (web and management-web)

## Objective
Ensure Next.js apps are fully ESM-compatible and aligned with workspace module strategy.

## Primary Areas

- `apps/web`
- `apps/management-web`

## Key Files

- `apps/web/tsconfig.json`
- `apps/management-web/tsconfig.json`
- `apps/web/next.config.ts`
- `apps/management-web/next.config.ts`
- `apps/web/next-intl.config.js`
- `apps/management-web/next-intl.config.js`

## Prereqs

- Confirm the chosen ESM boundary and output strategy from subplan 10.
- Verify Next.js version supports ESM config patterns in use.

## Detailed Steps

1. **TS config alignment**
   - Confirm `module`/`moduleResolution` settings align with ESM strategy.
2. **Next.js config conversion**
   - Convert `next-intl.config.js` to ESM (`.mjs` or `.ts` export default).
   - Ensure Next.js picks up the new config files.
3. **Code audit**
   - Replace any remaining `require()` usage in app code or server utilities.
   - Verify any Node-only scripts used by the apps still run under ESM.
4. **Build/dev verification**
   - Run `npm run dev -w apps/web` and `npm run dev -w apps/management-web`.
   - Run `npm run build -w apps/web` and `npm run build -w apps/management-web`.

## Expected Deliverables

- ESM-compatible config files and runtime behavior.
- No CommonJS syntax or config in web apps.

## Acceptance Criteria

- Both web apps run in dev mode without ESM-related errors.
- Production builds succeed for both apps.
- No CJS config files remain unless explicitly required by Next.js.
