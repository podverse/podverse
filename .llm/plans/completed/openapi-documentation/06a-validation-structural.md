# 06a: Structural Validation Subplan

## Goal
Validate OpenAPI structural correctness before behavioral verification.

## Validation Checklist
- valid YAML format
- no unresolved component references
- unique `operationId` values
- consistent schema types and required fields
- coherent security scheme references

## Output
- structural validation report
- list of blocking issues and fixes

## Exit Criteria
- no blocking structural errors remain
- specs are parseable by validator tools
