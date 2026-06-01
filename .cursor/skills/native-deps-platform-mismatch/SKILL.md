---
name: native-deps-platform-mismatch
description: Detect and surface missing-native-binary errors (e.g. @rollup/rollup-darwin-arm64) without mutating node_modules or the lockfile.
version: 1.0.0
---

# Native deps platform mismatch

The Podverse lockfile is Linux-canonical but lists optional deps for every platform (see [LOCKFILE-LINUX.md](/docs/development/tooling/LOCKFILE-LINUX.md)). The repo also has a Docker-based script ([scripts/development/update-lockfile-linux.sh](/scripts/development/update-lockfile-linux.sh)) that regenerates the lockfile; after it runs on macOS, the host's `node_modules` no longer has darwin native binaries until the host runs `npm install` again.

## When to use

Errors like:

- `Cannot find module @rollup/rollup-darwin-arm64`
- `Cannot find module @next/swc-darwin-arm64`
- `Cannot find module @parcel/watcher-darwin-arm64`
- `Cannot find module sharp` (when prebuilt platform binary is missing)

## Do

- Surface the error to the user with the missing package name and host platform.
- Recommend the user run `npm install` on the host – this materializes the platform-specific optional deps already listed in the lockfile and does not modify `package-lock.json`.
- If the user recently ran `update-lockfile-linux.sh`, point them at the "After running on macOS" section of [LOCKFILE-LINUX.md](/docs/development/tooling/LOCKFILE-LINUX.md).

## Do not

- Do not run `npm install`, `npm ci`, `npm rebuild`, `npm install --no-save`, or `npm install --no-save --no-package-lock` autonomously. These mutate `node_modules` and may mutate `package-lock.json` in subtle ways across platforms.
- Do not modify [package-lock.json](/package-lock.json), [package.json](/package.json), or [scripts/development/update-lockfile-linux.sh](/scripts/development/update-lockfile-linux.sh) unless the user explicitly asks for that work.
- Do not blame the lockfile. The lockfile entries are correct; the host `node_modules` is the broken artifact.

## Why a rule, not a "ban npm ci"

`npm ci` itself is fine. The CI Dockerfiles (e.g. [apps/api/Dockerfile](/apps/api/Dockerfile), [apps/workers/Dockerfile](/apps/workers/Dockerfile)) use it intentionally. The agent failure mode this skill prevents is running mutating commands speculatively while debugging a missing-binary error – which can corrupt the lockfile or hide the underlying environment problem from the user.
