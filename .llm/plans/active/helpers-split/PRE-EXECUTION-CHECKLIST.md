# Pre-Execution Checklist for Helpers-Split

Run these commands **before** submitting the mega-prompt for unattended execution.

## 1. Save Current State

```bash
# Commit any uncommitted changes
git add -A
git commit -m "Pre-helpers-split: Clean state before refactoring"

# Create backup branch
git checkout -b helpers-split-backup

# Create execution branch
git checkout -b helpers-split-execution
```

## 2. Ensure Clean Build

```bash
# Clean everything
npm run clean:all

# Build packages to ensure starting from good state
npm run build:packages

# Verify builds pass
npm run build:apps
```

## 3. Verify No Existing Issues

```bash
# Check for linting issues
npm run lint

# Check for type errors
npm run type-check
```

## 4. Submit the Mega-Prompt

Open `MEGA-PROMPT.md` and copy the entire prompt (starting from "Execute the complete...").

Paste into Cursor and send.

---

## Monitoring Progress (Without Interrupting)

Check these periodically without sending messages to the agent:

### Check TODO Status

```bash
cat .cursor/todos.json | grep -A 2 "helpers-split"
```

### Check Git Status

```bash
git status --short
git log --oneline -10
```

### Check History Updates

```bash
cat .llm/history/active/helpers-split/helpers-split.md
tail -50 .llm/history/active/helpers-split/helpers-split.md
```

### Check Build Status (Non-Intrusive)

```bash
# Check if packages exist
ls -la packages/ | grep helpers

# Check recent file modifications
find packages apps -name "*.ts" -mmin -60 | head -20
```

---

## If Execution Stops

If the agent stops partway through, submit this resume prompt:

```
Resume the helpers-split execution from where you left off.
Check .llm/history/active/helpers-split/helpers-split.md to see
what's been completed. Continue with the next incomplete phase.
Follow all the same autonomy rules: no confirmation requests,
fix errors automatically, work until complete.
```

---

## Recovery If Things Go Wrong

```bash
# Reset to backup
git checkout helpers-split-backup

# Delete failed execution branch
git branch -D helpers-split-execution

# Start fresh
git checkout -b helpers-split-execution-attempt-2

# Then resubmit the mega-prompt
```

---

## Post-Execution Verification

Once the agent reports completion:

```bash
# Verify all builds pass
npm run clean:all
npm run build:packages
npm run build:apps

# Verify linting passes
npm run lint

# Verify type checking passes
npm run type-check

# Check bundle sizes (if applicable)
cd apps/web
npm run build
# Check .next/standalone or build output sizes
```

---

## Expected Timeline

- **Phase 1**: ~15 minutes (5 packages)
- **Phase 2**: ~10 minutes (update core)
- **Phase 3**: ~15 minutes (10 import updates)
- **Phase 4**: ~20 minutes (verification)
- **Total**: ~60 minutes

If it takes longer than 2 hours, check for issues.
