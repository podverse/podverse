# 315-queue-add-next-last

**Master step:** 10.6
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Implement add-to-queue next/last via same POST wrappers as web, through the queue repository.
- Replace `runQueueAction` stub behavior on Home/Episode/Library rows with real mutations.

## File paths

- Extend `queueRepository` with mutation methods; keep screens on hooks.

## Acceptance criteria

- Add next / add last updates upcoming and syncs to server when authenticated
- Anonymous path uses local snapshot rules (coordinate with 10.18)
- UI notice/toast parity with stub replacement
- Native-cache projection invoked after successful local write

## Web parity references

- Web list row queue actions / queue POST wrappers
- Mobile stubs: `apps/mobile/src/screens/home/useHomeRowPlaybackStub.ts`

## Verification

```bash
npm run mobile:e2e:test -- podcast-episode
```

## Depends on

- 10.1 / 310
