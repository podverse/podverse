# 740-home-empty-discovery-ctas

**Master step:** P2.1.1 follow-up
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

When a Home chip has no subscribed rows, offer discovery shortcuts. Browse is always available;
Search only where Podcast Index feed lookup applies.

### Empty button matrix

| Chip                                | Buttons                                      |
| ----------------------------------- | -------------------------------------------- |
| Podcasts                            | Search (`all`) + Browse (`podcasts`)         |
| Artists / Albums / Tracks           | Search (`music`) + Browse (matching chip)    |
| Episodes                            | Browse only (`episodes`)                     |
| Clips — no podcast follows          | Browse only (`clips`)                        |
| Clips — podcast follows, signed out | Login only (`authentication.login_required`) |
| Clips — signed in, zero clips       | Browse only (`clips`)                        |

Copy stays the generic `subscriptions.empty_message` except the Clips login fill, which uses
`authentication.login_required`.

### Navigation

- `BrowseRoot` accepts `{ mediaType?: BrowseMediaType }`; apply + persist, then clear the param.
- `SearchRoot` accepts `{ autoFocus?: boolean; medium?: 'all' | 'music' }`; apply + persist.

### Primitive

`CallToActionSection` gains an optional second action so Search + Browse share one fill.

## Acceptance criteria

- Empty Podcasts / music chips show Search and Browse; Episodes / Clips (non-login) show Browse only.
- Browse opens with the matching chip selected.
- Search from Artists lands on the Music medium chip.
- Clips with local podcast follows while signed out shows Login, not Browse and not dummy clips.
- Filter-no-match empty stays message-only (no discovery buttons).

## Web parity references

- Web `HowToStartInfo` links to Search and global lists; mobile uses discrete buttons.
- [705-home-subscribed-list-and-filter](705-home-subscribed-list-and-filter.md)
- [709-search-tab-web-alignment](709-search-tab-web-alignment.md)

## Verification

```bash
# Mobile Maestro
npm run mobile:e2e:test -- home
npm run mobile:e2e:test -- subscriptions-anonymous
```
