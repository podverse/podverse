# Linux-canonical package lockfile

CI runs on **Linux** (GitHub Actions `ubuntu-latest`). Several dependencies use **optional**, platform-specific native bindings (e.g. `@parcel/watcher`, `@next/swc-linux-x64-gnu`, next-intl’s `@swc/core`). If `package-lock.json` is generated on macOS, it may not include the Linux optional deps, and CI can fail when running `npm ci --include=optional`.

To keep the lockfile correct for CI, generate or refresh it **under Linux**.

## When to do it

- **After adding or updating dependencies** (e.g. `npm install <pkg>`, or editing `package.json` by hand). Run the script, then commit the updated `package-lock.json`.
- **When bumping version** – The [bump-version script](../../scripts/publish/bump-version.sh) runs the Linux lockfile step automatically before committing, so you don’t need to run it yourself for version bumps.

## How

From the repo root (requires Docker):

```bash
./scripts/development/update-lockfile-linux.sh
```

This runs `npm install --include=optional` inside a Node 24 Linux container and writes the resulting `package-lock.json` into the repo. Commit the updated lockfile so CI and Docker builds use it.

## See also

- [AGENTS.md](../../AGENTS.md) – Lock file and workspace dependencies (includes this rule)
- [Contributing](CONTRIBUTING.md) – General workflow and PR guidelines
