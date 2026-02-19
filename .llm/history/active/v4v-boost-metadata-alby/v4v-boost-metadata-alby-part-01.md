# Feature: v4v-boost-metadata-alby (Part 1)

> **Note**: This LLM history file is optional. If you're not using LLM assistance for development, you can delete this file and the containing directory. The history tracking system helps document LLM-assisted decisions but is not required for contributing.
>
> **10-Session Limit**: Each part file is limited to 10 sessions. When adding Session 11, create `v4v-boost-metadata-alby-part-02.md`.

## Metadata

- Started: 2026-02-18
- Completed: In Progress
- Author: Mitch Downey
- LLM(s): Cursor, Claude, etc.
- GitHub Issues: https://github.com/podverse/podverse/issues/47
- Branch: feature/v4v-boost-metadata-alby
- Origin: git@github.com:podverse/podverse.git
- Is Fork: no

## Context

[What problem does this solve? What's the goal?]

## Sessions

### Session 1 - 2026-02-18

#### Prompt (Developer)

[First prompt will go here]

#### Key Decisions

- Rename `@podverse/helpers-v4v-metadata` to `@podverse/helpers-v4v` and add recipient split normalization.
- Normalize recipient splits by proportion to 100 and round down for payment amounts.
- Use add-by-RSS Boost actions to launch the same BoostForm modal as core.
- Update test assets to include both keysend and lnaddress recipients with fixed splits.

#### Files Changed

- .llm/plans/active/v4v-metaboost-lnurl/00-master-plan.md
- .llm/plans/active/v4v-metaboost-lnurl/01-partytime-metaboost.md
- .llm/plans/active/v4v-metaboost-lnurl/02-helpers-v4v-metadata.md
- .llm/plans/active/v4v-metaboost-lnurl/03-external-services-alby.md
- .llm/plans/active/v4v-metaboost-lnurl/04-orm-schema-migrations.md
- .llm/plans/active/v4v-metaboost-lnurl/05-parser-mapping-ingest.md
- .llm/plans/active/v4v-metaboost-lnurl/06-api-endpoints-dtos.md
- .llm/plans/active/v4v-metaboost-lnurl/07-web-ui-core.md
- .llm/plans/active/v4v-metaboost-lnurl/08-web-ui-add-by-rss.md
- .llm/plans/active/v4v-metaboost-lnurl/09-docs-local-setup.md
- .llm/plans/active/v4v-metaboost-lnurl/10-test-assets-seeding.md

---

### Session 2 - 2026-02-18

#### Prompt (Developer)

MetaBoost + LNURL V4V Implementation (Comprehensive Plan)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Create staged plan files under `.llm/plans/active/v4v-metaboost-lnurl/` with a master index and
  per-phase subplans aligned to repo scope (podverse monorepo + partytime).

#### Files Changed

- [List of files]

## Related Resources

- [Link to PR]
- [Link to related issues]

---

### Session 3 - 2026-02-18

#### Prompt (Developer)

V4V metaBoost Plan Addendum

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Hardcode BoostBox (localhost) and Alby Sandbox settings for development with TODOs for production.
- Persist metaBoost schema/url alongside value rows and surface in DTOs and UI.
- Keep client-side boost submission direct to BoostBox with manual testing focus.

#### Files Changed

- /Users/mitcheldowney/repos/pv/partytime/src/parser/phase/phase-4.ts
- /Users/mitcheldowney/repos/pv/partytime/src/parser/types.ts
- /Users/mitcheldowney/repos/pv/podverse/packages/helpers-v4v-metadata/package.json
- /Users/mitcheldowney/repos/pv/podverse/packages/helpers-v4v-metadata/tsconfig.json
- /Users/mitcheldowney/repos/pv/podverse/packages/helpers-v4v-metadata/src/index.ts
- /Users/mitcheldowney/repos/pv/podverse/packages/external-services-alby/package.json
- /Users/mitcheldowney/repos/pv/podverse/packages/external-services-alby/tsconfig.json
- /Users/mitcheldowney/repos/pv/podverse/packages/external-services-alby/src/index.ts
- /Users/mitcheldowney/repos/pv/podverse/package.json
- /Users/mitcheldowney/repos/pv/podverse/packages/parser-mapping/package.json
- /Users/mitcheldowney/repos/pv/podverse/packages/parser-mapping/src/types/partytime.ts
- /Users/mitcheldowney/repos/pv/podverse/packages/parser-mapping/src/compat/partytime/value.ts
- /Users/mitcheldowney/repos/pv/podverse/packages/parser-mapping/src/compat/partytime/channel.ts
- /Users/mitcheldowney/repos/pv/podverse/packages/parser-mapping/src/compat/partytime/item.ts
- /Users/mitcheldowney/repos/pv/podverse/packages/orm/src/entities/channel/channelValue.ts
- /Users/mitcheldowney/repos/pv/podverse/packages/orm/src/entities/item/itemValue.ts
- /Users/mitcheldowney/repos/pv/podverse/packages/orm/src/services/channel/channelValue.ts
- /Users/mitcheldowney/repos/pv/podverse/packages/orm/src/services/item/itemValue.ts
- /Users/mitcheldowney/repos/pv/podverse/packages/helpers/src/dtos/channel/channelValue.ts
- /Users/mitcheldowney/repos/pv/podverse/packages/helpers/src/dtos/item/itemValue.ts
- /Users/mitcheldowney/repos/pv/podverse/infra/database/migrations/0015_metaboost.sql
- /Users/mitcheldowney/repos/pv/podverse/infra/database/combined/init_database.sql
- /Users/mitcheldowney/repos/pv/podverse/infra/k8s/base/db/init-scripts.configmap.yaml
- /Users/mitcheldowney/repos/pv/podverse/apps/web/package.json
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/BoostForm.tsx
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/styles/components/Boost/BoostForm.module.scss
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/AddByRSS/Podcast/AddByRSSPodcastHeader.tsx
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/AddByRSS/Artist/AddByRSSArtistHeader.tsx
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/AddByRSS/Artist/Album/AddByRSSAlbumHeader.tsx
- /Users/mitcheldowney/repos/pv/podverse/tools/test-assets/src/generate-feed-cli.ts
- /Users/mitcheldowney/repos/pv/podverse/docs/V4V-METABOOST-LNURL.md
- /Users/mitcheldowney/repos/pv/podverse/.llm/context/architecture.md
- /Users/mitcheldowney/repos/pv/podverse/docs/architecture/ARCHITECTURE.md

---

### Session 4 - 2026-02-18

#### Prompt (Developer)

instead of meta_boost_schema and meta_boost_url being columns on the parent level value tables, they should be saved in new tables and optionally referenced to the parent tables. the metaboost tables must have a parent relationship but the value tables optionally may have a metaboost relationship

#### Key Decisions

- Move metaBoost data into new `channel_value_meta_boost` and `item_value_meta_boost` tables.
- Keep value tables optionally related to metaBoost rows via one-to-one relations.
- Load and persist metaBoost relations in ORM services and parser ingestion.

#### Files Modified

- /Users/mitcheldowney/repos/pv/podverse/packages/orm/src/entities/channel/channelValueMetaBoost.ts
- /Users/mitcheldowney/repos/pv/podverse/packages/orm/src/entities/item/itemValueMetaBoost.ts
- /Users/mitcheldowney/repos/pv/podverse/packages/orm/src/entities/channel/channelValue.ts
- /Users/mitcheldowney/repos/pv/podverse/packages/orm/src/entities/item/itemValue.ts
- /Users/mitcheldowney/repos/pv/podverse/packages/orm/src/services/channel/channelValueMetaBoost.ts
- /Users/mitcheldowney/repos/pv/podverse/packages/orm/src/services/item/itemValueMetaBoost.ts
- /Users/mitcheldowney/repos/pv/podverse/packages/orm/src/services/channel/channelValue.ts
- /Users/mitcheldowney/repos/pv/podverse/packages/orm/src/services/item/itemValue.ts
- /Users/mitcheldowney/repos/pv/podverse/packages/orm/src/index.ts
- /Users/mitcheldowney/repos/pv/podverse/packages/orm/src/services/channel/channel.ts
- /Users/mitcheldowney/repos/pv/podverse/packages/orm/src/services/item/item.ts
- /Users/mitcheldowney/repos/pv/podverse/packages/orm/src/db/entities.ts
- /Users/mitcheldowney/repos/pv/podverse/packages/parser-mapping/src/compat/partytime/value.ts
- /Users/mitcheldowney/repos/pv/podverse/packages/parser-mapping/src/compat/partytime/channel.ts
- /Users/mitcheldowney/repos/pv/podverse/packages/parser-mapping/src/compat/partytime/item.ts
- /Users/mitcheldowney/repos/pv/podverse/packages/parser/src/lib/rss/channel/channelValue.ts
- /Users/mitcheldowney/repos/pv/podverse/packages/parser/src/lib/rss/item/itemValue.ts
- /Users/mitcheldowney/repos/pv/podverse/packages/helpers/src/dtos/channel/channelValue.ts
- /Users/mitcheldowney/repos/pv/podverse/packages/helpers/src/dtos/item/itemValue.ts
- /Users/mitcheldowney/repos/pv/podverse/infra/database/migrations/0015_metaboost.sql
- /Users/mitcheldowney/repos/pv/podverse/infra/database/combined/init_database.sql
- /Users/mitcheldowney/repos/pv/podverse/infra/k8s/base/db/init-scripts.configmap.yaml
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/BoostForm.tsx
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/AddByRSS/Podcast/AddByRSSPodcastHeader.tsx
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/AddByRSS/Artist/AddByRSSArtistHeader.tsx
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/AddByRSS/Artist/Album/AddByRSSAlbumHeader.tsx
- /Users/mitcheldowney/repos/pv/podverse/docs/V4V-METABOOST-LNURL.md

---

### Session 5 - 2026-02-18

#### Prompt (Developer)

include a mermaid diagram for the v4v + metaboost process. it should be in its own file. the docs you wrote should also be in subdirectories with logical grouping

#### Key Decisions

- Move V4V MetaBoost documentation into a dedicated `docs/v4v/` grouping.
- Add a standalone Mermaid diagram file that maps the V4V + metaBoost flow.

#### Files Modified

- /Users/mitcheldowney/repos/pv/podverse/docs/v4v/V4V-METABOOST-LNURL.md
- /Users/mitcheldowney/repos/pv/podverse/docs/v4v/V4V-METABOOST-FLOW.mmd
- /Users/mitcheldowney/repos/pv/podverse/.llm/plans/active/v4v-metaboost-lnurl/09-docs-local-setup.md

---

### Session 6 - 2026-02-18

#### Prompt (Developer)

the flow should be in a md file with a little context explanation of what it is for

#### Key Decisions

- Replace the Mermaid-only file with a Markdown doc that includes context and the diagram.

#### Files Modified

- /Users/mitcheldowney/repos/pv/podverse/docs/v4v/V4V-METABOOST-FLOW.md
- /Users/mitcheldowney/repos/pv/podverse/docs/v4v/V4V-METABOOST-LNURL.md
- /Users/mitcheldowney/repos/pv/podverse/.llm/plans/active/v4v-metaboost-lnurl/09-docs-local-setup.md

---

### Session 7 - 2026-02-18

#### Prompt (Developer)

looks like the diagram is invalid

#### Key Decisions

- Replace Mermaid label newlines with `<br/>` to avoid parse errors.

#### Files Modified

- /Users/mitcheldowney/repos/pv/podverse/docs/v4v/V4V-METABOOST-FLOW.md

---

### Session 8 - 2026-02-18

#### Prompt (Developer)

V4V Boost Message Flow

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Implement BoostBox-first metadata flow with WebLN payments for lnaddress/keysend.
- Use bLIP-0010 TLV record 7629169 for keysend metadata when metaBoost is absent.
- Add BoostBox error modal and boost-messages info page with i18n content.

#### Files Modified

- /Users/mitcheldowney/repos/pv/podverse/packages/helpers-v4v-metadata/src/index.ts
- /Users/mitcheldowney/repos/pv/podverse/packages/external-services-alby/src/index.ts
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/utils/value/webln.ts
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/BoostForm.tsx
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/styles/components/Boost/BoostForm.module.scss
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/contexts/Modals.tsx
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Modal/ModalBoostMessageError.tsx
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Modals/Modals.tsx
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/v4v/boost-messages/page.tsx
- /Users/mitcheldowney/repos/pv/podverse/apps/web/i18n/originals/en-US.json
- /Users/mitcheldowney/repos/pv/podverse/docs/v4v/V4V-METABOOST-LNURL.md
- /Users/mitcheldowney/repos/pv/podverse/tools/test-assets/src/generate-feed-cli.ts

---

### Session 9 - 2026-02-18

#### Prompt (Developer)

create a new, separate plan file, and save it locally, which contains all of the remaining work and questions needed to make the full implementation a 5/5, and also move the other plan files to "completed" since they will be surpassed by this new plan file

#### Key Decisions

- Consolidate remaining work and open questions into a single new plan file for final completion.
- Move the existing v4v-metaboost-lnurl plan files to completed status.

#### Files Modified

- /Users/mitcheldowney/repos/pv/podverse/.llm/plans/active/v4v-metaboost-lnurl/11-remaining-work.md
- /Users/mitcheldowney/repos/pv/podverse/.llm/plans/completed/v4v-metaboost-lnurl/00-master-plan.md
- /Users/mitcheldowney/repos/pv/podverse/.llm/plans/completed/v4v-metaboost-lnurl/01-partytime-metaboost.md
- /Users/mitcheldowney/repos/pv/podverse/.llm/plans/completed/v4v-metaboost-lnurl/02-helpers-v4v-metadata.md
- /Users/mitcheldowney/repos/pv/podverse/.llm/plans/completed/v4v-metaboost-lnurl/03-external-services-alby.md
- /Users/mitcheldowney/repos/pv/podverse/.llm/plans/completed/v4v-metaboost-lnurl/04-orm-schema-migrations.md
- /Users/mitcheldowney/repos/pv/podverse/.llm/plans/completed/v4v-metaboost-lnurl/05-parser-mapping-ingest.md
- /Users/mitcheldowney/repos/pv/podverse/.llm/plans/completed/v4v-metaboost-lnurl/06-api-endpoints-dtos.md
- /Users/mitcheldowney/repos/pv/podverse/.llm/plans/completed/v4v-metaboost-lnurl/07-web-ui-core.md
- /Users/mitcheldowney/repos/pv/podverse/.llm/plans/completed/v4v-metaboost-lnurl/08-web-ui-add-by-rss.md
- /Users/mitcheldowney/repos/pv/podverse/.llm/plans/completed/v4v-metaboost-lnurl/09-docs-local-setup.md
- /Users/mitcheldowney/repos/pv/podverse/.llm/plans/completed/v4v-metaboost-lnurl/10-test-assets-seeding.md

---

### Session 10 - 2026-02-18

#### Prompt (Developer)

V4V Remaining Work Completion Plan

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- [Decision and rationale]

#### Files Modified

- /Users/mitcheldowney/repos/pv/podverse/.llm/plans/active/v4v-metaboost-lnurl/11-remaining-work.md
- /Users/mitcheldowney/repos/pv/podverse/.llm/context/architecture.md
- /Users/mitcheldowney/repos/pv/podverse/docs/architecture/ARCHITECTURE.md
- /Users/mitcheldowney/repos/pv/podverse/docs/v4v/V4V-METABOOST-LNURL.md
- /Users/mitcheldowney/repos/pv/podverse/package.json
- /Users/mitcheldowney/repos/pv/podverse/apps/web/package.json
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/BoostForm.tsx
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/BoostRecipientInfo.tsx
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/BoostRecipientInfoRow.tsx
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/AddByRSS/Podcast/AddByRSSPodcastHeader.tsx
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/AddByRSS/Artist/AddByRSSArtistHeader.tsx
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/AddByRSS/Artist/Album/AddByRSSAlbumHeader.tsx
- /Users/mitcheldowney/repos/pv/podverse/apps/web/src/utils/addByRSS/boost.ts
- /Users/mitcheldowney/repos/pv/podverse/packages/helpers-v4v/package.json
- /Users/mitcheldowney/repos/pv/podverse/packages/helpers-v4v/src/index.ts
- /Users/mitcheldowney/repos/pv/podverse/packages/parser-mapping/package.json
- /Users/mitcheldowney/repos/pv/podverse/packages/parser-mapping/src/compat/partytime/value.ts
- /Users/mitcheldowney/repos/pv/podverse/tools/test-assets/src/generate-feed-cli.ts
