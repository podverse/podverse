# Execution order

Two independent steps; either order. Both depend only on the already-landed
`useMembershipGate` hook (`apps/web/src/hooks/useMembershipGate.ts`).

1. **01-queue-add-gate.md** — route all "Add to Queue (Next/Last/Between)" row/header actions through
   the membership gate (highest-value: common action, many call sites). Recommend a shared helper.
2. **02-webpush-enable-gate.md** — surface the membership 403 from webpush device register so
   `enableWebPush` / `NotificationIconButton` show the modal instead of a generic `alert()`.

Verification: `apps/web` E2E screenshot report for the affected specs (see COPY-PASTA final block).
