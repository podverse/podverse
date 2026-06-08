#!/usr/bin/env bash

# Script to fix QueryParams imports - move them from @podverse/helpers to @podverse/helpers-requests
# EXCEPT QueryParamsMedium and QueryParamsQueueMedium which stay in @podverse/helpers

set -e

cd /Users/mitcheldowney/repos/pv/podverse/apps/web/src

# Types that should STAY in @podverse/helpers  
STAY_IN_HELPERS="QueryParamsMedium|QueryParamsQueueMedium"

# Find all files with QueryParams imports from @podverse/helpers
find . -name "*.ts" -o -name "*.tsx" | while read file; do
  # Check if file has QueryParams* imports from @podverse/helpers
  if grep -q "QueryParams.*from '@podverse/helpers'" "$file"; then
    echo "Processing: $file"
    
    # Get all QueryParams types from this file
    query_imports=$(grep -o "QueryParams[a-zA-Z]*" "$file" | sort -u)
    
    # Separate into helpers vs helpers-requests
    helpers_types=""
    requests_types=""
    
    for type in $query_imports; do
      if echo "$type" | grep -qE "^($STAY_IN_HELPERS)$"; then
        helpers_types="$helpers_types $type"
      else
        requests_types="$requests_types $type"
      fi
    done
    
    if [ -n "$requests_types" ]; then
      echo "  Moving to helpers-requests: $requests_types"
      echo "  Keeping in helpers: $helpers_types"
    fi
  fi
done
