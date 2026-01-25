#!/bin/bash

# Podverse Complete Feature Script
# Finalizes LLM history and moves to completed directory
# NOTE: This script is called by CI on merge, not by developers directly

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0m'
NC='\033[0m'

BRANCH=$(git rev-parse --abbrev-ref HEAD)
FEATURE_NAME=$(echo "$BRANCH" | sed 's|^[^/]*/||')
HISTORY_DIR=".llm/history/active/$FEATURE_NAME"
DATE=$(date +%Y-%m)

echo ""
echo -e "${CYAN}📋 Completing feature: $FEATURE_NAME${NC}"
echo ""

# Check for history directory
if [[ ! -d "$HISTORY_DIR" ]]; then
    echo -e "${YELLOW}No LLM history directory found at $HISTORY_DIR${NC}"
    echo "This is normal if LLM assistance wasn't used for this feature."
    echo ""
    
    # Check for any active history directories
    ACTIVE_DIRS=$(ls -1d .llm/history/active/*/ 2>/dev/null | head -10)
    if [[ -n "$ACTIVE_DIRS" ]]; then
        echo "Active history directories found:"
        echo "$ACTIVE_DIRS"
        echo ""
        read -p "Enter the correct feature name (or press Enter to skip): " CORRECT_NAME
        if [[ -n "$CORRECT_NAME" ]]; then
            HISTORY_DIR=".llm/history/active/$CORRECT_NAME"
            FEATURE_NAME="$CORRECT_NAME"
            if [[ ! -d "$HISTORY_DIR" ]]; then
                echo -e "${RED}❌ Directory not found: $HISTORY_DIR${NC}"
                exit 1
            fi
        else
            echo "Skipping history completion."
            exit 0
        fi
    else
        echo "No active history directories found."
        exit 0
    fi
fi

# Create destination directory
mkdir -p ".llm/history/completed/$DATE"

# Update completion date in all markdown files
echo -e "${CYAN}Updating completion date in history files...${NC}"
for file in "$HISTORY_DIR"/*.md; do
    if [[ -f "$file" ]]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/Completed: In Progress/Completed: $(date +%Y-%m-%d)/" "$file"
        else
            sed -i "s/Completed: In Progress/Completed: $(date +%Y-%m-%d)/" "$file"
        fi
    fi
done

# Move directory to completed
mv "$HISTORY_DIR" ".llm/history/completed/$DATE/$FEATURE_NAME"

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Completed date updated in all history files${NC}"
echo -e "${GREEN}✓ History moved to .llm/history/completed/$DATE/$FEATURE_NAME/${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
