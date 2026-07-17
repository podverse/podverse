# 282-opml-export-entry-ui

**Master step:** 9.23
**Model (author + implement):** Auto
**Status:** done

## Scope

- OPML export entry-point button in More/Library (UI + navigation only).
- Actual OPML generation + share is Track 16.6–16.7; this step just adds the entry point.

## Acceptance criteria

- Export entry present with localized label + `testID` `opml-export-entry`
- Navigates to the (stub) export flow; no generation logic here
- Tokenized styling

## Web parity references

- Web OPML export affordance (settings/library area); implementation deferred to Track 16
- More stack: [`225-more-stack`](/docs/proposals/mobile/_master-plan_/details/225-more-stack.md)

## Verification

```bash
npm run mobile:ios -- --device "iPhone 17 Pro"
```
