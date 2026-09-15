# mobile-p2-playback-reconciliation — execution order

Run prompts from [COPY-PASTA.md](COPY-PASTA.md) in this order. The contract flows outward from
shared types, to the database, to the API, and only then to the two clients.

This set covers **both** P2.4.11 (reconciliation) and P2.4.12 (the handoff prompt).

## Sequence

```text
01  shared contract + helpers        (pure, no consumers yet)
        |
02  SQL migration + ORM              (columns, backfill, trigger, history ordering)
        |
03  API endpoints                    (accept + clamp timestamps, batch replay route)
        |
        +-----------------------+
        |                       |
04  web writes              05  mobile outbox
        |                       |
        |               06  mobile position writes
        |                       |
        |               07  mobile reconcile merge   (resolves data only)
        |                       |
        +-----------+-----------+
                    |
08  multi-device handoff prompt      (web + mobile; the user-facing choice)
                    |
09  tests, E2E, abcmemory, status flips
```

## Sequential vs parallel

| Prompts      | Relationship                                                                    |
| ------------ | ------------------------------------------------------------------------------- |
| 01 → 02 → 03 | Strictly sequential. Each depends on the contract the previous one establishes. |
| 04 and 05    | **May run in parallel.** Different apps, no shared files.                       |
| 05 → 06 → 07 | Strictly sequential. Each builds on the previous mobile layer.                   |
| 08           | Needs 04 and 07 both done — it touches web and mobile.                          |
| 09           | Last. Needs every surface in place.                                              |

## Why this order

**01 first** because the meaningful-event vocabulary and the clamp function are the only things
every other prompt agrees on. Writing them as pure functions with tests means prompts 04 and 06
cannot drift into two different definitions of "meaningful".

**02 before 03** because history ordering moves off `list_position`, and the API cannot return
correctly ordered history until the column, the backfill, and the row-limit trigger exist.

**03 before both clients** because the clients are writing to a contract. Building either client
first means guessing at validation shape and then reworking it.

**05 before 06** because position writes need somewhere to go when the network is absent. Wiring
`PlaybackProvider` to a POST that fails offline just reproduces today's bug with more steps.

**07 before 08** because the handoff prompt consumes a conflict that 07 produces as data. 07
deliberately changes nothing the user sees; 08 is where a conflict becomes a question. Splitting
them this way means the merge can be proven correct before any UI depends on it.

**08 spans web and mobile** because the decision is that the affordance is symmetric. Building it
on one surface first is how it becomes a mobile quirk.

## Do not run tests during implementation

Agents implement and hand the operator verification commands at the end of each response. The
cumulative command set for the whole plan appears on prompt 09.

## After each prompt

1. Mark the prompt `[x]` in [COPY-PASTA.md](COPY-PASTA.md).
2. Move the completed numbered plan file to the mirrored path under
   `.llm/plans/completed/mobile-p2-playback-reconciliation/`
   ([`plan-lifecycle`](/.cursor/rules/plan-lifecycle.mdc)).
3. When the last prompt lands, flip **both** P2.4.11 and P2.4.12 to `done` in the Phase 2 master
   plan Track P2.4 table **and** the Appendix detail index, and set the headers of 743 and 744 to
   `**Status:** done`.
4. Move the remaining set files to `completed/` and update the master plan's Track P2.4 reference
   to the `completed/` path. Do **not** delete the set — the master plan links locked-decision
   lists at `.llm/plans/completed/mobile-p2-*/00-SUMMARY.md` for every closed area.
