#!/bin/bash

# Podverse Complete Feature Script
# Finalizes LLM history and moves to completed directory

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BRANCH=$(git rev-parse --abbrev-ref HEAD)
FEATURE_NAME=$(echo "$BRANCH" | sed 's|^[^/]*/||')
HISTORY_FILE=".llm/history/active/$FEATURE_NAME.md"
DATE=$(date +%Y-%m)

echo ""
echo -e "${CYAN}📋 Completing feature: $FEATURE_NAME${NC}"
echo ""

# Check if history file exists
if [[ ! -f "$HISTORY_FILE" ]]; then
    echo -e "${RED}❌ No history file found at $HISTORY_FILE${NC}"
    echo ""
    echo "This could mean:"
    echo "  - The feature wasn't started with 'npm run start-feature'"
    echo "  - The history file has a different name than the branch"
    echo ""
    
    # Check for any active history files
    ACTIVE_FILES=$(ls -1 .llm/history/active/*.md 2>/dev/null | head -5)
    if [[ -n "$ACTIVE_FILES" ]]; then
        echo "Active history files found:"
        echo "$ACTIVE_FILES"
        echo ""
        read -p "Enter the correct history filename (without .md): " CORRECT_NAME
        if [[ -n "$CORRECT_NAME" ]]; then
            HISTORY_FILE=".llm/history/active/$CORRECT_NAME.md"
            FEATURE_NAME="$CORRECT_NAME"
            if [[ ! -f "$HISTORY_FILE" ]]; then
                echo -e "${RED}❌ File not found: $HISTORY_FILE${NC}"
                exit 1
            fi
        else
            exit 1
        fi
    else
        exit 1
    fi
fi

# Update Completed date
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/Completed: In Progress/Completed: $(date +%Y-%m-%d)/" "$HISTORY_FILE"
else
    # Linux
    sed -i "s/Completed: In Progress/Completed: $(date +%Y-%m-%d)/" "$HISTORY_FILE"
fi

# Move to completed
mkdir -p ".llm/history/completed/$DATE"
mv "$HISTORY_FILE" ".llm/history/completed/$DATE/$FEATURE_NAME.md"

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Completed date updated${NC}"
echo -e "${GREEN}✓ History moved to .llm/history/completed/$DATE/$FEATURE_NAME.md${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo "  1. Stage the moved history file: git add .llm/history/"
echo "  2. Commit your final changes"
echo "  3. Push and create a Pull Request"
echo ""
