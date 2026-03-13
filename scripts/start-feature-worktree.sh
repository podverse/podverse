#!/usr/bin/env bash

# Podverse Start Feature Worktree Script
# Creates a new branch in a new work tree with symlinked env overrides and LLM history,
# so you can start working immediately without re-entering override values.

set -euo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

echo ""
echo -e "${GREEN}Starting new feature in a work tree...${NC}"
echo ""

# 1. Feature type (same as start-feature.sh)
echo -e "${CYAN}Select feature type:${NC}"
select TYPE in feature fix chore docs hotfix release; do
  [[ -n "$TYPE" ]] && break
done

# 2. Short name (same as start-feature.sh)
echo ""
read -p "Short name (kebab-case, e.g., add-podcast-chapters): " NAME

if [[ ! "$NAME" =~ ^[a-z][a-z0-9-]*$ ]]; then
  echo -e "${YELLOW}Name should be kebab-case (lowercase letters, numbers, hyphens)${NC}"
  read -p "Continue anyway? [y/N]: " -n 1 -r
  echo ""
  [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
fi

# 3. Origin and repo URL (same as start-feature.sh)
ORIGIN=$(git remote get-url origin 2>/dev/null || echo "unknown")
IS_FORK="no"
if [[ "$ORIGIN" != *"podverse/podverse"* ]]; then
  IS_FORK="yes"
fi
REPO_URL=$(echo "$ORIGIN" | sed -E 's|git@github.com:|https://github.com/|' | sed -E 's|\.git$||')

# 4. GitHub issues (same as start-feature.sh)
echo ""
ISSUE_URLS=""
while true; do
  if [[ -z "$ISSUE_URLS" ]]; then
    read -p "GitHub issue number (optional, press Enter to skip): " ISSUE_NUM
  else
    read -p "Another issue number? (press Enter to continue): " ISSUE_NUM
  fi

  if [[ -z "$ISSUE_NUM" ]]; then
    break
  fi

  if [[ ! "$ISSUE_NUM" =~ ^[0-9]+$ ]]; then
    echo -e "${YELLOW}Please enter a number (e.g., 123)${NC}"
    continue
  fi

  ISSUE_URL="$REPO_URL/issues/$ISSUE_NUM"
  if [[ -z "$ISSUE_URLS" ]]; then
    ISSUE_URLS="$ISSUE_URL"
  else
    ISSUE_URLS="$ISSUE_URLS, $ISSUE_URL"
  fi
done

# 5. Branch name and work tree path
BRANCH="$TYPE/$NAME"
BRANCH_SUFFIX="${BRANCH//\//-}"
DEFAULT_PATH="../podverse-$BRANCH_SUFFIX"
echo ""
read -p "Work tree path [${DEFAULT_PATH}]: " WORKTREE_PATH
WORKTREE_PATH="${WORKTREE_PATH:-$DEFAULT_PATH}"

if [[ -d "$WORKTREE_PATH" ]]; then
  echo -e "${YELLOW}Path already exists: $WORKTREE_PATH${NC}"
  exit 1
fi

# 6. Base branch
read -p "Create branch from [develop]: " BASE_BRANCH
BASE_BRANCH="${BASE_BRANCH:-develop}"

# 7. Create work tree and branch (path is relative to REPO_ROOT if not absolute)
echo ""
echo -e "${CYAN}Creating work tree at $WORKTREE_PATH (branch: $BRANCH)...${NC}"
(cd "$REPO_ROOT" && git worktree add "$WORKTREE_PATH" -b "$BRANCH" "$BASE_BRANCH")

# Resolve to absolute path for make -C and history file
if [[ "$WORKTREE_PATH" != /* ]]; then
  WORKTREE_ABS="$(cd "$REPO_ROOT" && cd "$WORKTREE_PATH" && pwd)"
else
  WORKTREE_ABS="$WORKTREE_PATH"
fi
WORKTREE_PATH="$WORKTREE_ABS"

# 8. In work tree: link env overrides and run local env setup
echo ""
echo -e "${CYAN}Linking env overrides and generating local env files...${NC}"
make -C "$WORKTREE_PATH" local_env_link
make -C "$WORKTREE_PATH" local_env_setup

# 9. Create LLM history file in work tree (same template as start-feature.sh)
HISTORY_DIR="$WORKTREE_PATH/.llm/history/active/$NAME"
HISTORY_FILE="$HISTORY_DIR/$NAME-part-01.md"
DATE=$(date +%Y-%m-%d)
AUTHOR=$(git config user.name || echo "Unknown")

mkdir -p "$HISTORY_DIR"

cat > "$HISTORY_FILE" << EOF
# Feature: $NAME (Part 1)

> **Note**: This LLM history file is optional. If you're not using LLM assistance for development, you can delete this file and the containing directory. The history tracking system helps document LLM-assisted decisions but is not required for contributing.
>
> **10-Session Limit**: Each part file is limited to 10 sessions. When adding Session 11, create \`$NAME-part-02.md\`.

## Metadata
- Started: $DATE
- Completed: In Progress
- Author: $AUTHOR
- LLM(s): Cursor, Claude, etc.
- GitHub Issues: ${ISSUE_URLS:-None}
- Branch: $BRANCH
- Origin: $ORIGIN
- Is Fork: $IS_FORK

## Context

[What problem does this solve? What's the goal?]

## Sessions

### Session 1 - $DATE

#### Prompt (Developer)
[First prompt will go here]

#### Key Decisions
- [Decision and rationale]

#### Files Changed
- [List of files]

---

## Related Resources

- [Link to PR]
- [Link to related issues]
EOF

echo ""
echo -e "${GREEN}Work tree ready.${NC}"
echo -e "  Branch:    $BRANCH"
echo -e "  Path:      $WORKTREE_PATH"
echo -e "  History:   $HISTORY_FILE"
echo ""

# Optionally open the work tree in a new Cursor/VS Code window
read -p "Open work tree in new Cursor/VS Code window? [y/N]: " -n 1 -r OPEN_NEW_WINDOW
echo ""
if [[ $OPEN_NEW_WINDOW =~ ^[Yy]$ ]]; then
  if command -v cursor >/dev/null 2>&1; then
    cursor -n "$WORKTREE_PATH" 2>/dev/null &
    echo -e "${GREEN}Opening work tree in new Cursor window.${NC}"
  elif command -v code >/dev/null 2>&1; then
    code -n "$WORKTREE_PATH" 2>/dev/null &
    echo -e "${GREEN}Opening work tree in new VS Code window.${NC}"
  else
    echo -e "${CYAN}Cursor/VS Code CLI not in PATH. Open manually: cursor -n $WORKTREE_PATH${NC}"
  fi
fi
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo "  cd $WORKTREE_PATH"
echo "  npm install   # if needed"
echo "  npm run build:packages"
echo "  Edit $HISTORY_FILE to add Context, then start working."
echo ""
