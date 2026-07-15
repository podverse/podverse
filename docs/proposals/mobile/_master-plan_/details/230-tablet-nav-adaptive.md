# 230-tablet-nav-adaptive

**Master step:** 7.17
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- At wide breakpoints (tablet), optional side rail or two-column layout instead of (or beside)
  bottom tabs.
- Phone layout remains five bottom tabs.
- Prefer React Navigation adaptive patterns / `useAspect` / dimensions — keep simple v1
  (side rail listing tab destinations is enough).

## Acceptance criteria

- Phone: bottom tabs unchanged
- Tablet width: secondary layout without losing route state
- Document breakpoint constant

## Web parity references

- Web responsive shell (partial); mobile tablet is native layout

## Verification

```bash
# Operator: iPad / large simulator if available
xcrun simctl list devices available | rg -i 'ipad' || true
```
