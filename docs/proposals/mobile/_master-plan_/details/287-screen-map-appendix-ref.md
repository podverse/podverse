# 287-screen-map-appendix-ref

**Master step:** 9.28
**Model (author + implement):** Auto
**Status:** done

## Scope

- Document the web→mobile screen map table linking each mobile screen (Tracks 8–9) to its web
  route/component reference, in the master plan appendix / process overview reference.
- Ensures future screens keep the visual-parity contract (mobile-theme-parity § Screen & visual
  parity) discoverable.

## Acceptance criteria

- A screen-map table exists mapping mobile screens → web route + component source
- Linked from master plan Appendix A / DOCS-MOBILE-PROCESS-OVERVIEW §5
- No dead links (paths verified)

## Web parity references

- [DOCS-MOBILE-PROCESS-OVERVIEW.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-OVERVIEW.md) §5
- Master plan Appendix A (screen map)

## Verification

```bash
grep -rq 'HomePageClient\|SearchPageClient' docs/proposals/mobile
```
