# 01 — Storage object detail page UX

## Goal

Update [`StorageObjectDetailPageClient.tsx`](../../../../apps/management-web/src/app/(management)/storage/[key]/StorageObjectDetailPageClient.tsx):

1. Reduce cramped vertical stacking of Download, Delete, and Back.
2. Use **`variant="danger"`** for destructive Delete (initial + confirm).
3. Use **`Button` `isLoading={deleteBusy}`** on the confirm action instead of only swapping label text.

## Context (current behavior)

- Actions are separate `<p>` blocks: raw `<a download>`, `Button variant="secondary"`, `ActionLink` back.
- Confirm dialog confirm uses `variant="primary"` and `deleteBusy ? t('deleting') : tc('confirm')`.

## Reference pattern

Database row detail uses `PageHeaderActions` + `Button variant="danger"` for delete (see
[`RowDetailPageClient.tsx`](../../../../apps/management-web/src/app/(management)/database/[table]/[id]/RowDetailPageClient.tsx)).

## Implementation checklist

### Imports (`@podverse/ui`)

- Add **`Divider`**, **`PageHeaderActions`** to the existing import list.

### Layout

1. After **`DescriptionList`**, render **`<Divider withSpacing />`** to separate metadata from actions.
2. Wrap **Download**, **Delete**, and **Back** in **`<PageHeaderActions>`** (single horizontal row with
   built-in `gap`). Keep **ConfirmPanel** **below** this row, full width.
3. **Download:** keep **`<a download href={getStorageObjectDownloadUrl(objectKey)}>`** (needs native
   `download`). Optionally tune styling next to `ActionLink` only if a visual pass shows mismatch.

### Destructive styling

4. Initial **Delete** button: **`variant="danger"`** (replace `"secondary"`).
5. Confirm submit button: **`variant="danger"`** (replace `"primary"`).

### Async delete UX

6. On the confirm button: set **`isLoading={deleteBusy}`**.
7. Remove the **`deleteBusy ? t('deleting') : tc('confirm')`** ternary; keep stable children
   **`{tc('confirm')}`** (spinner replaces visible label while loading per `Button` behavior).
8. **Cancel** button: **`disabled={deleteBusy}`** so the dialog cannot be dismissed mid-request.

### Out of scope / unchanged

- Initial metadata **`LoadingSpinner`** path stays as-is.
- Do not add spinners for download or session bootstrap.

## Files to touch

| File                                                                                                                      | Changes                                                                  |
| ---                                                                                                                       | ---                                                                      |
| `apps/management-web/src/app/(management)/storage/[key]/StorageObjectDetailPageClient.tsx`                                | Layout imports, action strip, danger variants, confirm `isLoading`       |

## Verification

- `npm run lint` (or workspace lint) including the touched file.
- Optional E2E: only if selectors/tests break; list specs typically unaffected.

## LLM history

After implementation, append session notes under `.llm/history/active/` per repo rules.
