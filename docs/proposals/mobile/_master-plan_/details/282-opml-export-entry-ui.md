# 282-opml-export-entry-ui

**Master step:** 9.23
**Model (author + implement):** Auto
**Status:** done

## Scope

- OPML export entry-point button in More/Library (UI + navigation only).
- Actual OPML generation + share delivered in Track 16.6–16.7; see
  `.llm/plans/completed/opml-import-export/` and [OPML](/docs/features/OPML.md).

## Acceptance criteria

- Export entry present with localized label + `testID` `opml-export-entry`
- Navigates to the (stub) export flow; no generation logic here
- Tokenized styling

## Web parity references

- Web OPML export: Settings → OPML (`SettingsOpml`)
- More stack: [`225-more-stack`](/docs/proposals/mobile/_master-plan_/details/225-more-stack.md)

## Verification

```bash
npm run mobile:ios -- --device "iPhone 17 Pro"
```
