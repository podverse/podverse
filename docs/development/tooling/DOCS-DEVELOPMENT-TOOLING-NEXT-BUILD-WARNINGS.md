# Next.js production build: file-descriptor warnings (Node 24)

During `next build` for `apps/web` and `apps/management-web`, Node may print many lines like:

```text
(node:12345) Warning: File descriptor 23 closed but not opened in unmanaged mode
(node:12345) Warning: File descriptor 23 opened in unmanaged mode twice
```

These are **benign** for normal development: the monorepo build still completes successfully. They come from Node 24’s worker `trackUnmanagedFds` checks interacting with **Turbopack** worker processes, not from Podverse application code in `src/`.

## What we do in this repo

- **Do not silence** these warnings (`NODE_NO_WARNINGS`, `--no-warnings`, or repo-wide `NODE_OPTIONS`) so future Node or tooling warnings stay visible in build logs.
- Treat the FD spam as **known cosmetic noise** until Next.js or Node addresses it upstream.

## When to act

| Situation                              | Action                                                                                                                                                                                                                                                     |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build succeeds; only these FD lines    | Safe to ignore; no Podverse code change required                                                                                                                                                                                                           |
| Build fails, EMFILE, or hung Turbopack | Investigate FD limits / tooling; not covered here                                                                                                                                                                                                          |
| After bumping **Next.js**              | Re-run `npm run build` from repo root; if warnings disappear or behavior regresses, note it; if they persist, consider a minimal repro on [vercel/next.js](https://github.com/vercel/next.js/issues) (Node 24, `next build`, Turbopack, full warning text) |

## Optional diagnosis

From an app directory, trace where Node emits the warning (expect Next/Turbopack/worker stacks, not app pages):

```bash
cd apps/web
node --trace-warnings ../../node_modules/next/dist/bin/next build
```

To compare bundlers (webpack may avoid Turbopack-specific noise; changes trace/NFT behavior):

```bash
cd apps/web
npx next build --webpack
```

## References

- Node worker FD tracking: [nodejs/node#34303](https://github.com/nodejs/node/pull/34303), default `trackUnmanagedFds` since Node 15+
- Similar tooling reports: [emscripten-core/emscripten#24731](https://github.com/emscripten-core/emscripten/issues/24731)
- No known matching issue in `vercel/next.js` for this exact message (as of 2026-05); file upstream if you have a minimal repro.
