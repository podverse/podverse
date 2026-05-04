# lockfile-linux-docker-bus-error

**Started:** 2026-05-04  
**Author:** LLM session  
**Context:** Diagnose bump-version / update-lockfile-linux.sh failure (Bus error in @swc/core postinstall under Docker).

### Session 1 - 2026-05-04

#### Prompt (Developer)

@/Users/mitcheldowney/.cursor/projects/Users-mitcheldowney-repos-pv-podverse-ansible/terminals/14.txt:7-281 debug

#### Key Decisions

- Root cause: `linux/amd64` under QEMU on Apple Silicon can SIGBUS when optional native packages (e.g. `next-intl` → `@swc/core`) run `postinstall.js`.
- Add `LOCKFILE_DOCKER_PLATFORM` (default `linux/amd64`), pre-run warning on Darwin arm64, failure hint, and **Troubleshooting** in `LOCKFILE-LINUX.md` (Rosetta vs `linux/arm64` override).
- Regenerated `package-lock.json` with `LOCKFILE_DOCKER_PLATFORM=linux/arm64` after the failed bump left the file deleted; confirmed lockfile still lists `@next/swc-linux-x64-gnu` for CI.

#### Files Created/Modified

- `scripts/development/update-lockfile-linux.sh`
- `docs/development/tooling/LOCKFILE-LINUX.md`
- `package-lock.json` (regenerated)
- `.llm/history/active/lockfile-linux-docker-bus-error/lockfile-linux-docker-bus-error-part-01.md`
