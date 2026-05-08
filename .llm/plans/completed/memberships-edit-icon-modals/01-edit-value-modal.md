# Phase 01 — EditValueModal (`@podverse/ui`)

- Add `packages/ui/src/components/feedback/EditValueModal/` (tsx, scss optional, test, stories).
- Props: `modalAriaLabel`, `isOpen`, `onClose`, `title`, `closeButtonAriaLabel`, `inputId`, `inputEyebrow`, `initialValue`, `type` (`number`|`text`), `min`/`max`/`step`, `numberStepperAriaLabels` when number, `cancelLabel`, `saveLabel`, `isSaving`, `externalError` (string | null), `onSubmit(raw: string)`.
- `useEffect` when `isOpen`: set local value from `initialValue`, clear local error unless `externalError` set.
- `Modal` + `Modal.Body` + `TextInput` + optional alert for errors + `Modal.Actions` (Cancel secondary, Save primary with `isLoading={isSaving}`).
- Export from `packages/ui/src/index.ts`.
