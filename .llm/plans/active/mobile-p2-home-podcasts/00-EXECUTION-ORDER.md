# Execution order

Locked decisions: [00-SUMMARY.md](00-SUMMARY.md). Prompts: [COPY-PASTA.md](COPY-PASTA.md).

## Sequence

**File numbers are the run order.** Work top to bottom, one prompt at a time.

Foundations first. The Home screens read through the seams those steps create, so running them out
of order means building Home twice. Web counterparts follow the foundation they depend on.

```text
01  Access tiers and shared gating seam    (P2.4.1)   ─┐
02  Anonymous subscriptions + bulk follow  (P2.4.2)    │  sequential — each depends on the last
03  Offline content sync                   (P2.4.3)    │
04  Channel seen state and API             (P2.4.4)   ─┘
05  Home subscribed list and filter        (P2.1.1)   ─┐
06  Home filter/sort screen                (P2.1.3)    │  sequential — same screen surface
07  Home row metadata                      (P2.1.1)    │
08  Home view toggle and overflow menu     (P2.1.1)   ─┘
09  Search tab web alignment               (P2.1.3)      independent; any time after 01
10  Web unseen episode indicator           (P2.5.1)      after 04
11  Web subscribed filter input            (P2.5.2)      after 05
12  Mobile per-instance sort prefs         (P2.4.6)      after 06
13  Web filter/sort persistence            (P2.5.3)      after 06, 12
14  Notifications read/unread rename       (P2.4.5)      leaf — see note; deliberately last
15  Record deferrals                       (P2.3.8/9)    last
```

Prompt **06** builds the sort-preference contract because it is the first consumer; **12** extends it
across mobile and **13** implements the web half against the same shared key builder.

**14 sits last on purpose — it is a dependency leaf.** Nothing in the set depends on it, so its
position is free. It is also the only irreversible step here: a breaking ORM column rename with a
linear migration and a coordinated field rename across API, web, i18n, and a browser event. The
legacy Notifications screen has not been reviewed yet, so holding it until just before **15** costs
nothing and keeps the option to revise the model once that screen is seen. If it reveals additional
states, revising a plan is cheap and revising a shipped migration is not.

## Dependencies

| Prompt | Depends on | Why                                                                    |
| ------ | ---------- | ---------------------------------------------------------------------- |
| 02     | 01         | Membership gating on follow needs the tier seam                        |
| 03     | 02         | Sync targets local subscriptions as the source of truth                |
| 04     | 03         | Unseen counts derive from locally stored item publish dates            |
| 05     | 02, 03     | Filter reads local channels and items                                  |
| 06     | 05         | The sort control lives on the list header built in 05                  |
| 07     | 04, 05     | The unseen badge needs the channel last-seen timestamp                 |
| 08     | 04, 07     | Mark All As Seen and the grid badge both need seen state               |
| 09     | 01         | The add flow presents the membership affordance                        |
| 10     | 04         | Web reads and writes the same seen-state endpoints                     |
| 11     | 05         | Shares the `consumer` i18n keys and filter semantics defined in 05     |
| 12     | 06         | Extends the sort-pref contract 06 establishes for Home                 |
| 13     | 06, 12     | Uses the same shared key builder; mirrors mobile's resolved behavior   |
| 14     | 04         | Renames fields the seen-state work touches                             |

## Parallel opportunities

The linear order above is the safe default. If you do want to overlap:

- **14** touches API, workers, web notifications, and the mobile notifications screen — safe
  alongside 05–08, which do not touch those files.
- **09** touches the Search screen and its E2E flows only — safe alongside 05–08.
- **10** and **11** are web-only and safe alongside each other once their dependencies land.

## Cross-surface warnings

- **01** and **14** modify `packages/helpers-requests`, which web imports. Both must keep web
  behavior identical; 14 is a breaking rename that needs a transition so an older mobile build does
  not break mid-rollout.
- **04** creates account-synced state. It is only correct once **10** ships — until web writes the
  timestamp, a user who listens on the website keeps a stale badge on their phone. Do not treat 10
  as optional polish.
- **02** adds a public API endpoint; update OpenAPI per **swagger-openapi**.
- **14** renames an ORM column; it needs a linear migration per **linear-db-migrations**.
- **06** adds a scope key builder to `@podverse/helpers` that both apps import. Web depends on it in
  **13**, so it must not be shaped around mobile's storage.
- **12** and **13** must produce the **same** user-visible behavior on both surfaces. They store
  differently — AsyncStorage vs a bounded cookie — because web renders on the server, not because the
  product rules differ.

## Rules while executing

- **Every new filter or sort control remembers its selection** per instance and device-locally, per
  [`filter-sort-persistence`](/.cursor/rules/filter-sort-persistence.mdc). Structured selections
  only — free-text filters still clear on reload.
- **Every new control ships screen reader accessible** — accessible name, role, and state, per
  [`screen-reader-accessibility`](/.cursor/rules/screen-reader-accessibility.mdc). A `testID` is not
  a label. The full audit of *existing* screens is deferred to P2.3.10; that deferral does not apply
  to anything built here.
- Do **not** run tests, lint, or E2E during implementation. End each response with the operator's
  verification commands in a fenced `bash` block.
- Web changes verify with `make e2e_test_web_report_spec`; mobile verifies with Maestro
  (`npm run mobile:e2e:test -- <area>`), never `make e2e_*`.
- Mark each COPY-PASTA prompt `[x]` as it completes, flip the matching detail doc header and the
  Phase 2 appendix row to `done`, and move the finished plan file per
  [`plan-completion`](/.cursor/skills/plan-completion/SKILL.md).
