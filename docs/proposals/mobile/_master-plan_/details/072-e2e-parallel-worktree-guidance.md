# 072-e2e-parallel-worktree-guidance

**Master step:** 5.13
**Model (author + implement):** Auto
**Status:** done

## Scope

- Note in e2e README or mobile-worktree-scope skill: Maestro YAML specs are safe to author in
  isolation per feature Track / worktree.

## Acceptance criteria

- Guidance exists and links mobile-worktree-scope
- No claim that native module work is always conflict-free

## Verification

```bash
rg -n 'worktree|parallel' apps/mobile/e2e/ .cursor/skills/mobile-worktree-scope/
```
