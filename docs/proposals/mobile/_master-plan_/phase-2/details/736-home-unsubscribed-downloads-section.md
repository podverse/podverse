# 736-home-unsubscribed-downloads-section

**Master step:** P2.1.5 / P2.1.1 follow-up
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

On **Home → Podcasts**, when the user has completed downloads for channels they are **not**
subscribed to, show those channels in a footer section.

### Behavior

- Section title: **Downloaded, not subscribed** (i18n).
- Same channel `HomeFeedRow` as subscriptions (art, title, downloaded count).
- Tap opens podcast detail.
- Section omitted when empty.
- A channel leaves the section when the user subscribes, or when its last complete download file
  is removed (including rows still present but `dismissedFromList` — those still count).

### Data

- Derive from completed downloads with `channelIdText`, minus current `subscriptionsRepository`
  ids.
- Prefer persisted channel title/artwork on the download row when the channel is not in
  `channel_item` / subscriptions.

## Acceptance criteria

- Unsubscribed channels with at least one complete download appear only under the footer section.
- Subscribed channels never appear in that section.
- Empty state: section not rendered.

## Web parity references

- Mobile-only. Home is subscribed-only on web for the main list; offline downloads are device-local.

## Verification

```bash
# Mobile Maestro
npm run mobile:e2e:test -- home-podcasts
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
