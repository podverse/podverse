# 281-opml-import-entry-ui

**Master step:** 9.22
**Model (author + implement):** Auto
**Status:** done

## Scope

- OPML import entry-point button in More/Library (UI + navigation only).
- Actual OPML parse + subscribe is Track 16.4–16.5; this step just adds the discoverable entry point.

## Acceptance criteria

- Import entry present with localized label + `testID` `opml-import-entry`
- Navigates to the (stub) import flow; no parsing logic here
- Tokenized styling

## Web parity references

- Web OPML import affordance (settings/library area); implementation deferred to Track 16
- More stack: [`225-more-stack`](/docs/proposals/mobile/_master-plan_/details/225-more-stack.md)

## Verification

```bash
npm run mobile:ios -- --device "iPhone 17 Pro"
```
