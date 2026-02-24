# Feature: v4v-lightning-rewrite (Part 1)

> **Note**: This LLM history file is optional. If you're not using LLM assistance for
> development, you can delete this file and the containing directory. The history tracking
> system helps document LLM-assisted decisions but is not required for contributing.
>
> **10-Session Limit**: Each part file is limited to 10 sessions. When adding Session 11,
> create `v4v-lightning-rewrite-part-02.md`.

## Metadata

- Started: 2026-02-24
- Completed: In Progress
- Author: Mitch Downey
- LLM(s): Cursor, Claude, etc.
- GitHub Issues: None
- Branch: (not set)
- Origin: git@github.com:podverse/podverse.git
- Is Fork: no

## Context

[Rewrite V4V lightning handling to group under type=lightning with per-recipient lnaddress
or node routing, align boost UI, and update test assets.]

## Sessions

### Session 1 - 2026-02-24

#### Prompt (Developer)

V4V Lightning Rewrite Plan

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Treat `type="lightning"` as the grouping key and merge multiple lightning blocks.
- Route LN payments per recipient type (`lnaddress` vs `node`) and ignore `method` behavior.
- Keep method `keysend` in generated value blocks while randomizing recipient types.

#### Files Modified

- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/BoostAppDonateForm.tsx
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/BoostForm.tsx
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/BoostFormBase.tsx
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/hooks/useBoostAppRecipients.ts
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/hooks/useBoostPayments.ts
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/hooks/useBoostRecipients.ts
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/hooks/useBoostSelection.ts
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/types.ts
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/utils/value/appValue.ts
- /Users/mitcheldowney/repos/pv/podverse/apps/web/i18n/originals/en-US.json
- /Users/mitcheldowney/repos/pv/podverse/packages/helpers/src/lib/value.ts
- /Users/mitcheldowney/repos/pv/podverse/packages/v4v-btc-ln/src/recipient-type.ts
- /Users/mitcheldowney/repos/pv/podverse/tools/test-assets/src/generate-feed-value-tags.ts
- /Users/mitcheldowney/repos/pv/partytime/src/parser/phase/phase-4.ts
- /Users/mitcheldowney/repos/pv/partytime/src/parser/phase/**test**/phase-4.test.ts
- /Users/mitcheldowney/repos/pv/podverse/.llm/history/active/v4v-lightning-rewrite/v4v-lightning-rewrite-part-01.md

---

### Session 2 - 2026-02-24

#### Prompt (Developer)

make the changes

#### Key Decisions

- Keep partytime parsing behavior unchanged and preserve lightning value blocks as-is.

#### Files Modified

- /Users/mitcheldowney/repos/pv/partytime/src/parser/phase/phase-4.ts
- /Users/mitcheldowney/repos/pv/partytime/src/parser/phase/**test**/phase-4.test.ts

---

### Session 3 - 2026-02-24

#### Prompt (Developer)

NEXT_PUBLIC_APP_VALUE_LIGHTNING_KEYSEND_NAME

environment variables like this need to be updated everywhere

that should be changed to

NEXT_PUBLIC_APP_VALUE_LIGHTNING_NODE_NAME

and apply that pattern wherever needed

#### Key Decisions

- Renamed lightning keysend env vars to lightning node across web config, validation, env
  examples, Lighthouse envs, and K8s config.
- Updated web app config accessors to use `lightning_node` for app value lookups.

#### Files Modified

- /Users/mitcheldowney/repos/pv/podverse/apps/web/.env.example
- /Users/mitcheldowney/repos/pv/podverse/apps/web/ENV.md
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/BoostAppDonateForm.tsx
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/config/index.ts
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/config/runtime-config.ts
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/utils/value/appValue.ts
- /Users/mitcheldowney/repos/pv/podverse/apps/web/sidecar/src/server.ts
- /Users/mitcheldowney/repos/pv/podverse/infra/k8s/base/web/configmap.yaml
- /Users/mitcheldowney/repos/pv/podverse/tools/web-perf/bundle-analyzer/src/env-config.ts
- /Users/mitcheldowney/repos/pv/podverse/tools/web-perf/lighthouse/.env.web
- /Users/mitcheldowney/repos/pv/podverse/tools/web-perf/lighthouse/.env.web.example

---

### Session 4 - 2026-02-24

#### Prompt (Developer)

consider this as a valid example

<podcast:value type="lightning" method="keysend" suggested="0.00000005000">
<podcast:valueRecipient name="Podcastindex.org" type="lnaddress" address="podcastindex@getalby.com" split="92"/>
<podcast:valueRecipient name="Dreb Scott (Chapters)" type="lnaddress" address="drebscott@getalby.com" split="5"/>
<podcast:valueRecipient name="Sovereign Feeds" address="035ad2c954e264004986da2d9499e1732e5175e1dcef2453c921c6cdcc3536e9d8" type="node" fee="true" split="5"/>
<podcast:valueRecipient name="Boostagram Monitor" type="lnaddress" address="adam@getalby.com" split="1"/>
<podcast:valueRecipient name="Stay Safe Sage" type="lnaddress" address="dave@getalby.com" split="1"/>
<podcast:valueRecipient name="Fountain Boost Bot" type="lnaddress" address="boostbot@fountain.fm" split="1"/>
<podcast:valueRecipient name="IPFSPodcasting.net" type="node" address="028eb5be336f7fdf2a4e40c57ff55d3d5d71277bb4197ea14957f756bff249e623" split="5" fee="true"/>
</podcast:value>

these environment variables

@.env (33-47)

won't need a "type" because it can be inferred as either "lnaddress" or "node" based on the name of the env vars

#### Key Decisions

- Removed app-value lightning `*_TYPE` env vars and inferred recipient type from env group name.

#### Files Modified

- /Users/mitcheldowney/repos/pv/podverse/apps/web/.env
- /Users/mitcheldowney/repos/pv/podverse/apps/web/.env.example
- /Users/mitcheldowney/repos/pv/podverse/apps/web/ENV.md
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/config/index.ts
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/config/runtime-config.ts
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/utils/value/appValue.ts
- /Users/mitcheldowney/repos/pv/podverse/apps/web/sidecar/src/server.ts
- /Users/mitcheldowney/repos/pv/podverse/infra/k8s/base/web/configmap.yaml
- /Users/mitcheldowney/repos/pv/podverse/tools/web-perf/bundle-analyzer/src/env-config.ts
- /Users/mitcheldowney/repos/pv/podverse/tools/web-perf/lighthouse/.env.web
- /Users/mitcheldowney/repos/pv/podverse/tools/web-perf/lighthouse/.env.web.example

---

### Session 5 - 2026-02-24

#### Prompt (Developer)

@en-US.json (287-298) lightning_keysend and lightning_lnaddress should not display as text in the web. those were intended for a previous implementation and should be removed ("Bitcoin Lightning" and "satoshis" should be enough)

#### Key Decisions

- Removed `lightning_keysend` and `lightning_lnaddress` value type labels from translations and
  switched fallback denomination to `types.lightning`.

#### Files Modified

- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/BoostRecipientStatusList.tsx
- /Users/mitcheldowney/repos/pv/podverse/apps/web/i18n/originals/en-US.json
- /Users/mitcheldowney/repos/pv/podverse/apps/web/i18n/originals/es.json
- /Users/mitcheldowney/repos/pv/podverse/apps/web/i18n/originals/fr.json
- /Users/mitcheldowney/repos/pv/podverse/apps/web/i18n/originals/el-GR.json
- /Users/mitcheldowney/repos/pv/podverse/apps/web/i18n/overrides/es.json
- /Users/mitcheldowney/repos/pv/podverse/apps/web/i18n/overrides/fr.json
- /Users/mitcheldowney/repos/pv/podverse/apps/web/i18n/overrides/el-GR.json

---

### Session 6 - 2026-02-24

#### Prompt (Developer)

update the env-config.ts to use

@.env.example (40-52)

and the APP_VALUE env vars should just be empty strings

#### Key Decisions

- Matched bundle-analyzer web env defaults to `.env.example` with empty app value vars.

#### Files Modified

- /Users/mitcheldowney/repos/pv/podverse/tools/web-perf/bundle-analyzer/src/env-config.ts

---

### Session 7 - 2026-02-24

#### Prompt (Developer)

make sure the APP_VALUE env vars are properly validated (as optional)

#### Key Decisions

- Added LNAddress APP_VALUE keys to web sidecar optional validation list and category map.

#### Files Modified

- /Users/mitcheldowney/repos/pv/podverse/apps/web/sidecar/src/server.ts

---

### Session 8 - 2026-02-24

#### Prompt (Developer)

apply the fix

#### Key Decisions

- Restored `isLnaddressRecipient` to a single-arg helper and passed recipient subtype.

#### Files Modified

- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/BoostFormBase.tsx
- /Users/mitcheldowney/repos/pv/podverse/packages/v4v-btc-ln/src/recipient-type.ts

---

### Session 9 - 2026-02-24

#### Prompt (Developer)

for the App Lightning Node and App Lightning LNAddress environment variables, if BOTH are set, then the web logic should only use LNAddress. also, the env var should error during validation and say that app can only set LNAddress or Node, not both

#### Key Decisions

- Added sidecar validation error when both app-value LNAddress and Node vars are set.
- Documented mutual exclusivity in env docs/examples.

#### Files Modified

- /Users/mitcheldowney/repos/pv/podverse/apps/web/sidecar/src/server.ts
- /Users/mitcheldowney/repos/pv/podverse/apps/web/ENV.md
- /Users/mitcheldowney/repos/pv/podverse/apps/web/.env.example
- /Users/mitcheldowney/repos/pv/podverse/apps/web/.env
