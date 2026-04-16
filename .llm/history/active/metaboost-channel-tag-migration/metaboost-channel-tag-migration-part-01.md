### Session 1 - 2026-04-14

#### Prompt (Developer)

@/Users/mitcheldowney/.cursor/projects/Users-mitcheldowney-repos-pv-podverse-ansible/terminals/9.txt:1083-1519 there are errors in the db init process. identify them and lets discuss solutions. as you can see from the metaboost repo, the metaboost tag has changed. both podverse monorepo and the partytime parser should be updated to account for this metaboost implementation, where a single <podcast:metaboost> tag is placed within the <channel> tag. remove the old metaboost handling from partytime and podverse where the metaboost tag is placed within the value tag. podcast metaboost tag should no longer be there, instead it should be in the <channel> tag as its own standalone thing.

#### Prompt (Developer)

implement the plan and reminder that we don't want backwards compatibility

#### Key Decisions

- Confirmed `make local_db_init` output was successful; `NOTICE` lines were idempotent SQL noise, not DB-init failures.
- Implemented a breaking migration: parse only standalone channel-level `podcast:metaBoost`.
- Removed value-nested MetaBoost handling in parser and mapping paths (no backward compatibility).
- Kept tag casing as `podcast:metaBoost` (camelCase).

#### Files Modified

- .llm/history/active/metaboost-channel-tag-migration/metaboost-channel-tag-migration-part-01.md
- ../partytime/src/index.ts
- ../partytime/src/parser/unified.ts
- ../partytime/src/parser/**test**/helpers.ts
- ../partytime/src/parser/phase/index.ts
- ../partytime/src/parser/phase/phase-pending.ts
- ../partytime/src/parser/phase/**test**/phase-pending.test.ts
- packages/parser-mapping/src/types/partytime.ts
- packages/parser-mapping/src/compat/partytime/channel.ts
- ../partytime/src/parser/phase/phase-4.ts
- ../partytime/src/parser/phase/phase-pending.ts
- ../partytime/src/parser/phase/index.ts
- ../partytime/src/parser/types.ts
- ../partytime/src/parser/phase/**test**/phase-4.test.ts
- ../partytime/src/parser/phase/**test**/phase-pending.test.ts
- packages/parser-mapping/src/types/partytime.ts

### Session 3 - 2026-04-14

#### Prompt (Developer)

it looks like the <podcast:metaBoost> in partytime does not align with how it is handled in metaboost monorepo and podverse monorepo

it should be a tag that goes in the <channel> tag

it should have a required attribute of "standard" and a required value inside the node. for example:

<podcast:metaBoost standard="mb1">https://api.metaboost.cc/v1/s/mb1/boost/JAyJS6QnNV/</podcast:metaBoost>

the standard can be any string value

the url in the node value should be https. this should be validated by default. if it is not https, the field should not be parsed. there should be a configurable param able to be set somewhere so that an app can pass "allowInsecureHTTPMetaboost" which will ignore this validation requirement.

#### Key Decisions

- Align pending MetaBoost parsing with `standard` + node URL format.
- Enforce HTTPS by default and allow HTTP only when parser option `allowInsecureHTTPMetaboost` is true.
- Add parser option plumbing so phase parsers can read parse options.

#### Files Modified

- .llm/history/active/metaboost-channel-tag-migration/metaboost-channel-tag-migration-part-01.md
- ../partytime/src/parser/phase/phase-4.ts
- ../partytime/src/parser/phase/index.ts
- ../partytime/src/parser/types.ts
- ../partytime/src/parser/phase/**test**/phase-4.test.ts
- packages/parser-mapping/src/types/partytime.ts
- packages/parser-mapping/src/compat/partytime/value.ts
- packages/parser-mapping/src/compat/partytime/channel.ts
- packages/parser-mapping/src/compat/partytime/item.ts
- tools/test-assets/src/generate-feed-value-tags.ts
- tools/test-assets/src/generate-feed-cli.ts

### Session 2 - 2026-04-14

#### Prompt (Developer)

MetaBoost is not actually a "Phase4" it is a later and not numerically identified phase yet. is there an existing alternate type along the lines of like "Experimental" or "Canary" or something like that, that we can add the metaBoost partytime handling into instead? if not, then create something like that

#### Key Decisions

- Use Partytime's existing pending/unnumbered pathway (`phase: Infinity`) for MetaBoost instead of Phase4.
- Rename MetaBoost parser/types to pending-phase naming for clarity.
- Keep strict behavior from prior change: only channel-level `podcast:metaBoost` supported.

#### Files Modified

- .llm/history/active/metaboost-channel-tag-migration/metaboost-channel-tag-migration-part-01.md
