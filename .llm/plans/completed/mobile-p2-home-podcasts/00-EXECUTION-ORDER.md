# Execution order

Locked decisions: [00-SUMMARY.md](00-SUMMARY.md). Prompts: [COPY-PASTA.md](COPY-PASTA.md).

## Sequence

**File numbers are the run order.** Work top to bottom, one prompt at a time.

Foundations first. The Home screens read through the seams those steps create, so running them out
of order means building Home twice. Web counterparts follow the foundation they depend on.

```text
01  Access tiers and shared gating seam    (P2.4.1)   ─┐
02  Anonymous subscriptions + bulk follow  (P2.4.2)    │  sequential — each depends on the last
03  Fast startup and serial sync queue     (P2.4.8)    │
04  Sync progress indicator                (P2.4.9)    │
05  Sync event log                         (P2.4.10)   │
06  Offline content sync                   (P2.4.3)    │
07  Channel seen state and API             (P2.4.4)   ─┘
08  Home subscribed list and filter        (P2.1.1)   ─┐
09  Home filter/sort screen                (P2.1.3)    │  sequential — same screen surface
10  Home row metadata                      (P2.1.1)    │
11  Home view toggle and overflow menu     (P2.1.1)   ─┘
12  Search tab web alignment               (P2.1.3)      independent; any time after 01
13  Web unseen episode indicator           (P2.5.1)      after 07
14  Web subscribed filter input            (P2.5.2)      after 08
15  Mobile per-instance sort prefs         (P2.4.6)      after 09
16  Web filter/sort persistence            (P2.5.3)      after 09, 15
17  Notifications read/unread rename       (P2.4.5)      leaf — see note; deliberately last
18  Record deferrals                       (P2.3.8/9/11/12) last
```

The combined Podcasts Home follow-up runs after the original Home foundation:

```text
19  Reconcile merged Home proposals          (P2.1.1)   ─┐
20  Complete subscription hydration           (P2.1.1)    │
21  Simplify Podcasts Home                    (P2.1.1)    │ sequential
22  Home-stack add-by-RSS detail              (P2.1.1)    │
23  Verify the combined Home contract         (P2.1.1)   ─┘
```

**The sync foundation (03–05) runs before offline content sync (06)** even though its master-step
numbers are higher. 06 is the largest producer of sync work in the app; building it before the queue
exists means shipping a large sync with no orchestration and reworking it immediately. Master step
numbers are identifiers, not a run order.

Prompt **09** builds the sort-preference contract because it is the first consumer; **15** extends it
across mobile and **16** implements the web half against the same shared key builder.

**17 sits last on purpose — it is a dependency leaf.** Nothing in the set depends on it, so its
position is free. It is also the only irreversible step here: a breaking ORM column rename with a
linear migration and a coordinated field rename across API, web, i18n, and a browser event. The
legacy Notifications screen has not been reviewed yet, so holding it until just before **15** costs
nothing and keeps the option to revise the model once that screen is seen. If it reveals additional
states, revising a plan is cheap and revising a shipped migration is not.

## Dependencies

| Prompt | Depends on | Why                                                                    |
| ------ | ---------- | ---------------------------------------------------------------------- |
| 02     | 01         | Membership gating on follow needs the tier seam                        |
| 03     | 02         | The queue's first jobs are the account and subscription sync           |
| 04     | 03         | The bar renders the queue's progress state                             |
| 05     | 03         | The log sinks the queue's failure listener                             |
| 06     | 02, 03     | Sync targets local subscriptions and enqueues on the serial queue      |
| 07     | 06         | Unseen counts derive from locally stored item publish dates            |
| 08     | 02, 06     | Filter reads local channels and items                                  |
| 09     | 08         | The sort control lives on the list header built in 08                  |
| 10     | 07, 08     | The unseen badge needs the channel last-seen timestamp                 |
| 11     | 07, 10     | Mark All As Seen and the grid badge both need seen state               |
| 12     | 01         | The add flow presents the membership affordance                        |
| 13     | 07         | Web reads and writes the same seen-state endpoints                     |
| 14     | 08         | Shares the `consumer` i18n keys and filter semantics defined in 08     |
| 15     | 09         | Extends the sort-pref contract 09 establishes for Home                 |
| 16     | 09, 15     | Uses the same shared key builder; mirrors mobile's resolved behavior   |
| 17     | 07         | Renames fields the seen-state work touches                             |

## Parallel opportunities

The linear order above is the safe default. If you do want to overlap:

- **17** touches API, workers, web notifications, and the mobile notifications screen — safe
  alongside 08–11, which do not touch those files.
- **12** touches the Search screen and its E2E flows only — safe alongside 08–11.
- **13** and **14** are web-only and safe alongside each other once their dependencies land.
- **05** only sinks a listener the queue already exposes, so it can run alongside 04.

## Cross-surface warnings

- **01** and **17** modify `packages/helpers-requests`, which web imports. Both must keep web
  behavior identical; 17 is a breaking rename that needs a transition so an older mobile build does
  not break mid-rollout.
- **07** creates account-synced state. It is only correct once **13** ships — until web writes the
  timestamp, a user who listens on the website keeps a stale badge on their phone. Do not treat 13
  as optional polish.
- **02** adds a public API endpoint; update OpenAPI per **swagger-openapi**.
- **17** renames an ORM column; it needs a linear migration per **linear-db-migrations**.
- **09** adds a scope key builder to `@podverse/helpers` that both apps import. Web depends on it in
  **16**, so it must not be shaped around mobile's storage.
- **03** rewrites the startup path and moves the auth hydrate chain into jobs. It touches
  `AuthProvider`, which every mobile surface reads — land it before the Home rebuild starts, not
  alongside it.
- **04** adds height to the bottom chrome. Every scrollable mobile screen is affected, so the Home
  work in 08–11 should build against the shared bottom-chrome inset it introduces.
- **15** and **16** must produce the **same** user-visible behavior on both surfaces. They store
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
- **Nothing network-bound may block first paint, and new background work goes on the queue** with a
  label, per [`mobile-sync-orchestration`](/.cursor/rules/mobile-sync-orchestration.mdc). A fetch
  that bypasses the queue is a gap in the indicator. Interactive work stays unqueued.
- **Anything added to the phone `tabBar` column must also be added to the tablet branch**, or it
  silently disappears at ≥900dp — see
  [896](/docs/proposals/mobile/_master-plan_/phase-2/details/896-defer-tablet-layout-parity.md).
- Do **not** run tests, lint, or E2E during implementation. End each response with the operator's
  verification commands in a fenced `bash` block.
- Web changes verify with `make e2e_test_web_report_spec`; mobile verifies with Maestro
  (`npm run mobile:e2e:test -- <area>`), never `make e2e_*`.
- Mark each COPY-PASTA prompt `[x]` as it completes, flip the matching detail doc header and the
  Phase 2 appendix row to `done`, and move the finished plan file per
  [`plan-completion`](/.cursor/skills/plan-completion/SKILL.md).
