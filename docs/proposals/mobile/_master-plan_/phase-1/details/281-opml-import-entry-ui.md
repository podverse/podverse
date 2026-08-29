# 281-opml-import-entry-ui

**Master step:** 9.22
**Model (author + implement):** Auto
**Status:** done

## Scope

- OPML import entry-point button in More/Library (UI + navigation only).
- Actual OPML parse + subscribe delivered in Track 16.4–16.5 (server async job); see
  `.llm/plans/completed/opml-import-export/` and [OPML](/docs/features/OPML.md).

## Acceptance criteria

- Import entry present with localized label + `testID` `opml-import-entry`
- Navigates to the (stub) import flow; no parsing logic here
- Tokenized styling

## Web parity references

- Web OPML import: Settings → OPML (`SettingsOpml`)
- More stack: [`225-more-stack`](/docs/proposals/mobile/_master-plan_/phase-1/details/225-more-stack.md)

## Verification

```bash
npm run mobile:ios -- --device "iPhone 17 Pro"
```
