# 594-stack-header-back-sketch

**Master step:** 9d.5
**Model (author + implement):** Auto
**Status:** draft

## Scope

- Ensure nested stacks expose a **usable** header back (React Navigation default and/or
  `ScreenHeader`) so operators can navigate without guessing.
- Sketch only — iconography polish is Track 23. Android system back remains Track 7.10.

## Acceptance criteria

- Push screens in Home / Library / Search stacks can go back via header or system back
- No dead-end screens without an exit path
- Document intentional exceptions (tab roots)

## Web parity references

- N/A (platform navigation)

## Verification

```bash
npm run mobile:ios -- --device "iPhone 17 Pro"
```
