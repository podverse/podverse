#!/bin/bash

# Podverse Start Feature Script
# Creates a properly named branch with aligned LLM history file

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${GREEN}🚀 Starting new feature...${NC}"
echo ""

# 1. Feature type
echo -e "${CYAN}Select feature type:${NC}"
select TYPE in feature fix chore docs hotfix release; do
    [[ -n "$TYPE" ]] && break
done

# 2. Short name
echo ""
read -p "Short name (kebab-case, e.g., add-podcast-chapters): " NAME

# Validate kebab-case
if [[ ! "$NAME" =~ ^[a-z][a-z0-9-]*$ ]]; then
    echo -e "${YELLOW}⚠️  Name should be kebab-case (lowercase letters, numbers, hyphens)${NC}"
    read -p "Continue anyway? [y/N]: " -n 1 -r
    echo ""
    [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
fi

# 3. Detect origin and build repo URL
ORIGIN=$(git remote get-url origin 2>/dev/null || echo "unknown")
IS_FORK="no"
if [[ "$ORIGIN" != *"podverse/podverse"* ]]; then
    IS_FORK="yes"
fi

# Extract repo URL for issue links (convert git@github.com:user/repo.git to https://github.com/user/repo)
REPO_URL=$(echo "$ORIGIN" | sed -E 's|git@github.com:|https://github.com/|' | sed -E 's|\.git$||')

# 4. GitHub issues (supports multiple)
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
    
    # Validate it's a number
    if [[ ! "$ISSUE_NUM" =~ ^[0-9]+$ ]]; then
        echo -e "${YELLOW}⚠️  Please enter a number (e.g., 123)${NC}"
        continue
    fi
    
    ISSUE_URL="$REPO_URL/issues/$ISSUE_NUM"
    if [[ -z "$ISSUE_URLS" ]]; then
        ISSUE_URLS="$ISSUE_URL"
    else
        ISSUE_URLS="$ISSUE_URLS, $ISSUE_URL"
    fi
done

# 5. Create branch
BRANCH="$TYPE/$NAME"

# Check if already on a feature branch with uncommitted changes
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$CURRENT_BRANCH" != "develop" && "$CURRENT_BRANCH" != "main" ]]; then
    echo ""
    echo -e "${YELLOW}⚠️  You're currently on branch: $CURRENT_BRANCH${NC}"
    read -p "Create new branch from here? [Y/n]: " -n 1 -r
    echo ""
    [[ $REPLY =~ ^[Nn]$ ]] && exit 1
fi

git checkout -b "$BRANCH"

# 6. Create history directory and file
HISTORY_DIR=".llm/history/active/$NAME"
HISTORY_FILE="$HISTORY_DIR/$NAME.md"
DATE=$(date +%Y-%m-%d)
AUTHOR=$(git config user.name || echo "Unknown")

# Create feature-specific directory
mkdir -p "$HISTORY_DIR"

cat > "$HISTORY_FILE" << EOF
# Feature: $NAME

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
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Branch created: $BRANCH${NC}"
echo -e "${GREEN}✓ History file created: $HISTORY_FILE${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo "  1. Edit $HISTORY_FILE to add Context"
echo "  2. Start working with your LLM"
echo "  3. Push and open a PR when done (history is auto-completed on merge)"
echo ""
