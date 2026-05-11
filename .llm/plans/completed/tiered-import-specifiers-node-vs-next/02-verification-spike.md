# Verification spike (optional)

## Goal

Confirm Turbopack **production build** behavior on the repo’s **Next.js version** when a relative import uses a **`.js` specifier** but only **`Foo.tsx`** exists.

## Steps

1. Note current Next version: `apps/web/package.json` / `apps/management-web/package.json` `"next"`.
2. In a **throwaway branch**, change one Tier B import from extensionless to `./SomeModule.js` targeting a `.tsx` file.
3. Run:

   ```bash
   npm run build -w apps/web
   npm run build -w apps/management-web
   ```

4. If build fails with **Module not found**, behavior matches [vercel/next.js#82945](https://github.com/vercel/next.js/issues/82945); revert spike.

## Community workaround (not default)

Issue comments describe a **custom Turbopack loader** rewriting source to strip `.js` from static `from` imports. **Deferred:** fragile (e.g. dynamic `import()`), maintenance cost. Only adopt with team approval and tests.

## References

- [Turbopack: support importing .ts/.tsx via .js extension](https://github.com/vercel/next.js/issues/82945)
