# Plan 1b: Git Hooks

## Overview

Set up git hooks for documentation reminders and issue reference tracking.

**Estimated time**: 15-20 minutes

**Depends on**: Plan 1a (directory structure)

---

## Step 1: Create `scripts/git-hooks/pre-commit`

```bash
#!/bin/bash

# Podverse Pre-Commit Hook

YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACMR)

CODE_CHANGES=$(echo "$STAGED_FILES" | grep -E '\.(ts|tsx|js|jsx)$' | grep -E '^(packages|apps|tools)/' || true)
INFRA_CHANGES=$(echo "$STAGED_FILES" | grep -E '^(infra|scripts|pipelines)/' || true)
HISTORY_UPDATED=$(echo "$STAGED_FILES" | grep -E '^\.llm/history/' || true)
DOCS_UPDATED=$(echo "$STAGED_FILES" | grep -E '^(docs/|\.llm/context/)' || true)

if [[ -n "$CODE_CHANGES" || -n "$INFRA_CHANGES" ]]; then
    if [[ -z "$HISTORY_UPDATED" && -z "$DOCS_UPDATED" ]]; then
        echo ""
        echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${YELLOW}║  📝 DOCUMENTATION REMINDER                                  ║${NC}"
        echo -e "${YELLOW}╠════════════════════════════════════════════════════════════╣${NC}"
        echo -e "${YELLOW}║  You're committing code changes without updating:          ║${NC}"
        echo -e "${YELLOW}║  - .llm/history/active/*.md (LLM session history)          ║${NC}"
        echo -e "${YELLOW}║  - docs/ or .llm/context/ (documentation)                  ║${NC}"
        echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        
        if [ -t 0 ]; then
            echo -e "${CYAN}Options:${NC} [Enter] Continue | [d] Checklist | [a] Abort"
            read -p "Choice: " -n 1 -r REPLY
            echo ""
            case $REPLY in
                [dD]) echo "□ .llm/history/active/[feature].md"; echo "□ docs/"; exit 1 ;;
                [aA]) echo "Aborted."; exit 1 ;;
            esac
        fi
    fi
fi
exit 0
```

---

## Step 2: Create `scripts/git-hooks/commit-msg`

```bash
#!/bin/bash

# Podverse Commit Message Hook

YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
NC='\033[0m'

COMMIT_MSG_FILE=$1
COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

if echo "$COMMIT_MSG" | grep -qE '#[0-9]+'; then
    exit 0
fi

echo ""
echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  🔗 No GitHub issue reference in commit message            ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
echo -e "${CYAN}Message:${NC} $COMMIT_MSG"
echo ""

if [ -t 0 ]; then
    echo -e "${CYAN}Options:${NC} [Enter] Continue | [e] Add issue | [a] Abort"
    read -p "Choice: " -n 1 -r REPLY </dev/tty
    echo ""
    case $REPLY in
        [eE])
            echo -e "${CYAN}Issue number(s):${NC}"
            read -r ISSUE_REFS </dev/tty
            [[ -n "$ISSUE_REFS" ]] && echo -e "\n$ISSUE_REFS" >> "$COMMIT_MSG_FILE"
            exit 0 ;;
        [aA]) echo "Aborted."; exit 1 ;;
        *) exit 0 ;;
    esac
fi
exit 0
```

---

## Step 3: Create `scripts/git-hooks/install-hooks.sh`

```bash
#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOKS_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)/.git/hooks"

echo "Installing git hooks..."
mkdir -p "$HOOKS_DIR"

cp "$SCRIPT_DIR/pre-commit" "$HOOKS_DIR/pre-commit"
chmod +x "$HOOKS_DIR/pre-commit"

cp "$SCRIPT_DIR/commit-msg" "$HOOKS_DIR/commit-msg"
chmod +x "$HOOKS_DIR/commit-msg"

echo "✓ Git hooks installed"
```

---

## Checklist

- [ ] `scripts/git-hooks/pre-commit` created
- [ ] `scripts/git-hooks/commit-msg` created
- [ ] `scripts/git-hooks/install-hooks.sh` created
- [ ] Run `npm install` to install hooks
- [ ] Test hooks work

---

## Next

Proceed to [01c-llm-infra.md](01c-llm-infra.md)
