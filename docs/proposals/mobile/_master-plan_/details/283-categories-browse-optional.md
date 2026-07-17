# 283-categories-browse-optional

**Master step:** 9.24
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Optional categories browse screen via category request wrappers, only if web home/browse exposes
  categories.
- Category list → filtered podcast/channel results using existing list rows.
- Mark optional: skip if web parity does not warrant it in v1 (document the decision).

## Acceptance criteria

- If built: categories load from same endpoint semantics as web and drill into results
- Layout mirrors web category browse, adapted to RN, tokenized
- If skipped: rationale recorded in the phase summary

## Web parity references

- [`apps/web/src/components/Category`](/apps/web/src/components/Category)
- **Visual parity:** `.cursor/skills/mobile-theme-parity/SKILL.md` § Screen & visual parity

## Verification

```bash
npm run mobile:ios -- --device "iPhone 17 Pro"
```
