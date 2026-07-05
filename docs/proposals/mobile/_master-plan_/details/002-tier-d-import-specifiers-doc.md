# 002-tier-d-import-specifiers-doc

**Master step:** 0.2
**Model (author + implement):** Codex 5.3
**Status:** ready

## Scope

Document Tier D (Metro/RN) import-specifier rules for `apps/mobile/**` in the import-specifiers doc.

## Acceptance criteria

- New Tier D section in DOCS-DEVELOPMENT-TOOLING-IMPORT-SPECIFIERS.md
- States extensionless relative imports for RN bundler
- Cross-links architecture tier table

## Web parity references

- [docs/development/tooling/DOCS-DEVELOPMENT-TOOLING-IMPORT-SPECIFIERS.md](/docs/development/tooling/DOCS-DEVELOPMENT-TOOLING-IMPORT-SPECIFIERS.md)
- [.cursor/skills/import-specifiers-tiered/SKILL.md](.cursor/skills/import-specifiers-tiered/SKILL.md)

## Verification

```bash
grep -q "Tier D" docs/development/tooling/DOCS-DEVELOPMENT-TOOLING-IMPORT-SPECIFIERS.md
grep -q "apps/mobile" docs/development/tooling/DOCS-DEVELOPMENT-TOOLING-IMPORT-SPECIFIERS.md
```
