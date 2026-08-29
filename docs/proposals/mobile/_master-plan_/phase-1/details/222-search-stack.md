# 222-search-stack

**Master step:** 7.3
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Nested stack under Search tab for search results + detail pushes.
- Placeholder Search screen until Track 9.8.

## Acceptance criteria

- Search tab owns its stack; independent of Home history
- Route names reserved for Search / SearchResultDetail

## Web parity references

- Web `/search` flows

## Verification

```bash
rg -n "Search" apps/mobile/src/navigation || true
```
