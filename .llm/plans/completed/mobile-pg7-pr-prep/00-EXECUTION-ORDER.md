# PG-7 PR prep — execution order

Run **01 → 03** in order on branch `feature/mobile-app-init-6`. Mark each COPY-PASTA step done
after the prompt finishes. Archive the set to `.llm/plans/completed/mobile-pg7-pr-prep/` on the
final prompt.

| Order | Plan file | Focus | Model |
| ----- | --------- | ----- | ----- |
| 1 | `01-i18n-locale-parity.md` | Translate + compile + validate new `media_player` keys | Auto |
| 2 | `02-android-close-button.md` | Confirm Close on Android; fix only if product-broken | Codex 5.3 |
| 3 | `03-verify-handoff.md` | Cumulative operator verify + commit guidance; archive | Auto |

```mermaid
flowchart LR
  P1["01 i18n parity"] --> P2["02 Android Close"]
  P2 --> P3["03 verify handoff"]
```

**Do not run tests during agent work.** End each response with operator commands in a fenced
`bash` block per **response-ending-make-verify**. On the final prompt, list **all** cumulative
verification commands for the whole set.
