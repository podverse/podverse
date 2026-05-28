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

This runs `npm install --include=optional` inside a Node 24 Linux x64 container and writes
the resulting `package-lock.json` into the repo. Forcing Linux x64 keeps optional native
dependency resolution aligned with GitHub Actions runners. Commit the updated lockfile so CI
and Docker builds use it.

### After running on macOS

The script runs `npm install` inside a Linux container with the repo bind-mounted, so any
`node_modules` the container creates would land on the host. The script removes that
container-created `node_modules` before exiting; the host's previous `node_modules` is no
longer trustworthy either way.

On macOS, run `npm install` on the host so darwin native binaries are restored:

```bash
npm install
```

This does **not** modify `package-lock.json` – the lockfile already lists every platform's
optional dependencies (darwin-arm64, darwin-x64, linux-x64, etc.). `npm install` simply
materializes the entries matching your host platform.

## Troubleshooting

### `Cannot find module @<scope>/<pkg>-darwin-arm64` (or similar)

The lockfile lists the package, but `node_modules` is missing the macOS native binary. This
usually means you recently ran `update-lockfile-linux.sh`. Fix:

```bash
npm install
```

### `Bus error` during `node postinstall.js` (e.g. under `@swc/core`)

This often happens on **Apple Silicon** when the script uses **`linux/amd64`**: the
container runs under emulation, and some native optional dependencies crash during
postinstall (exit code **135**).

**Fix (keep CI’s amd64 optional deps):** In **Docker Desktop → Settings → General**,
enable **Use Rosetta for x86/amd64 emulation on Apple Silicon**, then re-run
`update-lockfile-linux.sh`.

**Alternative:** Use a **native** Linux container (no QEMU) and override the platform
(verify `npm ci` on GitHub Actions still succeeds for your change):

```bash
LOCKFILE_DOCKER_PLATFORM=linux/arm64 ./scripts/development/update-lockfile-linux.sh
```

## See also

- [AGENTS.md](../../AGENTS.md) – Lock file and workspace dependencies (includes this rule)
- [Contributing](CONTRIBUTING.md) – General workflow and PR guidelines
