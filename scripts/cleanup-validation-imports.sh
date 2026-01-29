#!/bin/bash

# Script to remove unused validation imports from web app files
# Only removes the import if the file doesn't actually use the validation functions

set -e

VALIDATION_FUNCS="getEmailErrorKey|getPasswordErrorKey|getPassword2ErrorKey|getPasswordRequirementsInfoKey"
IMPORT_LINE="import { getEmailErrorKey, getPasswordErrorKey, getPassword2ErrorKey } from '@podverse/helpers-validation';"

files_checked=0
files_cleaned=0
files_kept=0

# Find all TypeScript/TSX files in web app that have the validation import
while IFS= read -r file; do
  files_checked=$((files_checked + 1))
  
  # Check if file uses any of the validation functions (excluding the import line itself)
  if grep -v "from '@podverse/helpers-validation'" "$file" | grep -qE "$VALIDATION_FUNCS"; then
    # File uses the functions - keep the import
    files_kept=$((files_kept + 1))
    echo "KEEP: $file (uses validation functions)"
  else
    # File doesn't use the functions - remove the import
    files_cleaned=$((files_cleaned + 1))
    
    # Remove the import line (both single-line and multi-line variations)
    sed -i '' "/import.*from '@podverse\/helpers-validation';/d" "$file"
    
    echo "CLEAN: $file (removed unused import)"
  fi
done < <(grep -rl "from '@podverse/helpers-validation'" apps/web/src --include="*.ts" --include="*.tsx" 2>/dev/null || true)

echo ""
echo "Summary:"
echo "  Files checked: $files_checked"
echo "  Imports kept: $files_kept"
echo "  Imports removed: $files_cleaned"
