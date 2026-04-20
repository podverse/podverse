### Session 1 - 2026-04-19

#### Prompt (Developer)

Boost Currency Assumption Hardening

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Execute to-dos in strict order from the approved plan.
- Remove silent source currency/unit fallbacks and require explicit metadata for threshold conversion.
- Resolve source currency from selected value tab type (`lightning` -> `BTC`) and fail closed when source metadata is unavailable.
- Keep protocol-level sat<->msat assumptions unchanged in payment request builders, while tightening threshold conversion preconditions against empty metadata values.

#### Files Modified

- .llm/history/active/boost-currency-assumption-hardening/boost-currency-assumption-hardening-part-01.md
- apps/web/src/components/Boost/BoostFormBase.tsx
- apps/web/src/components/Boost/BoostFormFields.tsx
- apps/web/src/components/Boost/hooks/useBoostSelection.ts
- apps/web/src/components/Boost/hooks/useBoostPayments.ts
