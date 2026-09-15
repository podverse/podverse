# 741-home-filter-channel-lists-only

**Master step:** P2.1.1 follow-up
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

The Home **Filter…** field is a local title substring over a **complete** list. It is honest only for
channel lists Home already holds in full.

### Visibility

Show Filter when **all** of:

1. The selected chip is `podcasts`, `artists`, or `albums`
2. That chip’s feed has at least one row
3. The feed finished loading without error

Hide on Episodes, Tracks, and Clips (API page / incomplete local windows). Hide whenever the list is
empty (empty CTA owns the body).

Filter-no-match copy and session-only persistence are unchanged.

## Acceptance criteria

- Filter visible on Podcasts / Artists / Albums with rows.
- Filter not visible on Episodes / Tracks / Clips.
- Filter not visible on empty lists.
- Maestro asserts the visibility matrix.

## Web parity references

- Web subscribed filter on `/podcasts` only ([713](713-web-subscribed-filter-input.md)).
- [705-home-subscribed-list-and-filter](705-home-subscribed-list-and-filter.md)

## Verification

```bash
# Mobile Maestro
npm run mobile:e2e:test -- home
npm run mobile:e2e:test -- subscriptions-anonymous
```
