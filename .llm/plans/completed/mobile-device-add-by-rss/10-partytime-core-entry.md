**Cursor model:** Codex 5.3 · **Reasoning:** high

# 10 — `podverse-partytime/core`: a React Native-safe entry point

Add a second, platform-neutral entry point to the sibling library `../partytime` (npm package
`podverse-partytime`). Mobile parses Add by RSS feeds through it on the device, and the server
switches to it in plan 11, so both run the same parser code.

This plan edits only `../partytime`. It does not publish, commit, or touch the monorepo. It builds
`dist/` in that checkout. Plan 11 links that build with a `file:` dependency and does not wait for
an npm publish.

## Rows

R9

## Runs after

none

## Files

- ../partytime/src/core.ts
- ../partytime/src/index.ts
- ../partytime/src/logger.ts
- ../partytime/src/settings.ts
- ../partytime/src/config.ts
- ../partytime/src/node-setup.ts
- ../partytime/src/parser/index.ts
- ../partytime/src/parser/utf8.ts
- ../partytime/src/parser/item.ts
- ../partytime/src/parser/__test__/utf8.test.ts
- ../partytime/src/__test__/core-portability.test.ts
- ../partytime/src/__test__/logger.test.ts
- ../partytime/package.json
- ../partytime/README.md
- ../partytime/release-notes/<version>.md (see § Version)

## Before you start

- `../partytime` has uncommitted operator work for 5.2.0 (`descriptionRaw` in
  `src/parser/feed.ts`, `src/parser/item.ts`, `src/parser/types.ts`, their tests, and an
  untracked `release-notes/5.2.0.md`). Keep every one of those edits. Edit `src/parser/item.ts`
  on top of them; do not revert, stash, or reformat them.
- Partytime style: double quotes, semicolons, CommonJS output (`tsc`, `module: commonjs`), ESLint
  airbnb-typescript with `import/prefer-default-export` off. Use named exports. Its
  `AGENTS.md` forbids running publish scripts and says tests are operator-run.
- Read `../partytime/AGENTS.md` and `../partytime/scripts/publish/README.md` once.

## What is Node-only today

The parser modules under `src/parser/` import only `fast-xml-parser`, `he`, `ramda/src/*` and
`tiny-invariant`, which bundle under Metro. The Node-only surface is:

| Module | Node-only part | Who imports it |
| --- | --- | --- |
| `src/config.ts` | `dotenv.config()` at import, `process.env` reads | `src/logger.ts`, `src/parser/index.ts`, `src/index.ts` |
| `src/logger.ts` | `pino` | every parser module that logs (`parser/index.ts`, `unified.ts`, `item.ts`, `feed.ts`, `phase/index.ts`, `phase/phase-1.ts`, `phase-3.ts`, `phase-4.ts`, `phase-7.ts`, `phase-pending.ts`), plus `cor/` and `shared.ts` |
| `src/shared.ts` | `fs`, `node-fetch` (`getFeedText`) | `cor/index.ts`, `dev.ts` |
| `src/cor/index.ts` | `node-fetch` (`checkFeedByUri`, `checkFeedByObject`) | `src/index.ts` |
| `src/parser/index.ts` | `Buffer.byteLength` in `parseFeed` | `src/index.ts`, `cor/`, tests |
| `src/parser/item.ts` | `process.env?.JEST_WORKER_ID` in `getGuid` | parser |

## Design (decided)

- **Additive subpath, not a breaking root change.** The package root `podverse-partytime` keeps
  its current behavior and exports (env config, pino, CORS checks). A new subpath
  `podverse-partytime/core` exports the parser, types, and logger controls with no Node-only
  import. This ships as a minor version.
- **The logger becomes a replaceable sink.** `src/logger.ts` keeps its path and its exported
  `logger` object, so the ten parser modules that import it need no edit. Its default sink writes
  to `console` at level `warn` and reads no environment. The package root installs pino into the
  sink, so root consumers see no change.
- **Env config moves behind the root entry.** `src/config.ts` keeps `dotenv` and the env parsing,
  and only `src/node-setup.ts` (loaded by `src/index.ts`) imports it. Core reads no env; a core
  caller passes `maxFeedBodyBytes` per call, as the server already does.
- **No `Buffer`.** `parseFeed` measures UTF-8 length with a pure function.

## Steps

### 1. `src/settings.ts` (new, portable)

- Move `DEFAULT_MAX_FEED_BODY_BYTES` (20 MiB) here from `src/config.ts`, with its doc comment.
- Add module state `configuredMaxFeedBodyBytes: number | undefined` with
  `setConfiguredMaxFeedBodyBytes(value: number | undefined): void` and
  `getConfiguredMaxFeedBodyBytes(): number | undefined`. Doc comment: the root entry sets this
  from `PARSER_MAX_FEED_BODY_BYTES`; core leaves it unset.
- These two functions are internal. Do not export them from `core.ts` or `index.ts`.

### 2. `src/logger.ts` (rewrite, portable)

```typescript
export type PartytimeLogLevel = "trace" | "debug" | "info" | "warn" | "error" | "silent";

export interface PartytimeLogger {
  trace(...args: unknown[]): void;
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}
```

- Use method syntax in the interface (not property arrows), so a pino logger is assignable.
- Built-in console sink: `trace` and `debug` call `console.debug`, `info` calls `console.info`,
  `warn` calls `console.warn`, `error` calls `console.error`. It drops calls below the current
  level. Numeric order: trace 10, debug 20, info 30, warn 40, error 50, silent above all.
  Default level `warn`. Add `// eslint-disable-next-line no-console` where the linter needs it.
- `setPartytimeLogger(sink: PartytimeLogger | null): void` installs a custom sink; `null`
  restores the console sink. A custom sink does its own level filtering.
- `setPartytimeLogLevel(level: PartytimeLogLevel): void` sets the console sink's level only.
- `export const logger: PartytimeLogger` forwards each call to the active sink as a method call
  (`activeSink.warn(...args)`), never a detached function, because pino needs its `this`.
- No import of `pino` or `./config` in this file.

### 3. `src/config.ts` (Node-only)

- Keep `dotenv.config()`, `getBooleanValue`, the env-driven log level, and
  `parseParserMaxFeedBodyBytes` (it must still throw on an invalid value; the existing test
  `src/parser/__test__/max-feed-body-bytes-env.test.ts` requires `../../config` and expects the
  throw).
- Remove `DEFAULT_MAX_FEED_BODY_BYTES` from this file (it lives in `settings.ts`). Grep `src/`
  for `DEFAULT_MAX_FEED_BODY_BYTES` and point every import at `./settings` or the entry points.
- Keep the default export `{ logLevel, environment, parserMaxFeedBodyBytes }`.

### 4. `src/node-setup.ts` (new, Node-only)

Side-effect module that the root entry imports first:

```typescript
import pino from "pino";

import config from "./config";
import { setPartytimeLogger } from "./logger";
import { setConfiguredMaxFeedBodyBytes } from "./settings";

const pinoLogger = pino({ level: config.logLevel });
setPartytimeLogger(pinoLogger);
setConfiguredMaxFeedBodyBytes(config.parserMaxFeedBodyBytes);
pinoLogger.debug(config);
```

If pino's logger is not assignable to `PartytimeLogger` under strict mode, wrap it in an object
whose five methods call `pinoLogger.<level>(...)` with the arguments spread; do not use `any` or
an `as` cast.

### 5. `src/parser/utf8.ts` (new, portable)

- `utf8ByteLength(text: string): number` — walk UTF-16 code units: below `0x80` adds 1, below
  `0x800` adds 2, a high surrogate (`0xD800`–`0xDBFF`) followed by a low surrogate
  (`0xDC00`–`0xDFFF`) adds 4 and skips the low one, anything else (including a lone surrogate,
  which encodes as U+FFFD) adds 3. This matches `Buffer.byteLength(text, "utf8")`.
- `exceedsUtf8ByteLimit(text: string, limit: number): boolean` — fast paths first: every code
  unit is at least 1 byte, so `text.length > limit` returns `true`; at most 3 bytes per code
  unit, so `text.length * 3 <= limit` returns `false`. Otherwise compare `utf8ByteLength(text)`
  with `limit`.

### 6. `src/parser/index.ts`

- Import `DEFAULT_MAX_FEED_BODY_BYTES` and `getConfiguredMaxFeedBodyBytes` from `../settings`;
  drop the `../config` import. In `resolveMaxFeedBodyBytes`, replace each
  `config.parserMaxFeedBodyBytes` with `getConfiguredMaxFeedBodyBytes()`. Resolution order stays
  `options.maxFeedBodyBytes` → configured value → default.
- In `parseFeed`, replace `Buffer.byteLength(trimmed, "utf8")` with
  `exceedsUtf8ByteLimit(trimmed, limit)`. Compute `utf8ByteLength(trimmed)` only inside the
  over-limit branch, for the existing warning text.

### 7. `src/parser/item.ts`

In `getGuid`, replace the `typeof process !== "undefined" && !process.env?.JEST_WORKER_ID`
block and its `console.warn` with `logger.warn("Empty/missing guid, returning empty string");`
(`logger` is already imported in this file). Leave the uncommitted `getDescriptionRaw` edits as
they are.

### 8. `src/core.ts` (new entry)

Export, in this order, everything `src/index.ts` exports today except `checkFeedByObject` and
`checkFeedByUri`:

- `DEFAULT_MAX_FEED_BODY_BYTES` from `./settings`
- `parseFeed` from `./parser`, type `ParserOptions` from `./parser/unified`
- `FeedType`, `ItunesFeedType`, `FeedObject`, `Enclosure`, `Episode` from `./parser/types`;
  `ItunesEpisodeType` from `./parser/item`
- the phase 1–8 and pending exports, `PersonRole`, `PersonGroup`, exactly as `index.ts` lists them

Add:

- `Phase4LiveStatus` (enum) to the phase-4 export line, and
  `export type { Phase4PodcastLiveItem, Phase4PodcastLiveItemItem } from "./parser/phase/phase-4";`
  so consumers stop deep-importing `dist/parser/phase/phase-4.js`.
- `export { setPartytimeLogger, setPartytimeLogLevel } from "./logger";` and
  `export type { PartytimeLogger, PartytimeLogLevel } from "./logger";`

`core.ts` must not import, directly or through any module it reaches, `./config`,
`./node-setup`, `./shared`, `./cor`, `pino`, `dotenv`, `node-fetch`, or a Node built-in.

### 9. `src/index.ts` (root entry)

```typescript
import "./node-setup";

export * from "./core";
export { checkFeedByObject, checkFeedByUri } from "./cor";
```

The root therefore also gains `Phase4LiveStatus`, the Phase 4 live-item types, and the logger
controls.

### 10. `package.json`

Add, after `"types"`:

```json
"exports": {
  ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
  "./core": { "types": "./dist/core.d.ts", "default": "./dist/core.js" },
  "./dist/*": "./dist/*",
  "./package.json": "./package.json"
},
"typesVersions": {
  "*": { "core": ["dist/core.d.ts"] }
},
```

- `./dist/*` keeps existing deep imports working for outside consumers, so the release stays
  minor. `typesVersions` serves TypeScript consumers on `moduleResolution: node`.
- Leave `main`, `types`, `version`, and `dependencies` unchanged. `pino`, `dotenv` and
  `node-fetch` stay dependencies of the root entry; Metro bundles only what `core` imports.
- Do not bump `version`. Leave it at the value already in `package.json`.

### 11. `README.md`

After the install paragraph ("Requires **Node.js 22.12 or newer**…"), add a section
`### Portable entry (React Native, browsers, servers)`:

- `import { parseFeed } from "podverse-partytime/core";` with the same `FeedObject` output.
- Core reads no environment and loads no Node module: pass `maxFeedBodyBytes` per call; logs go
  to `console` at `warn` until the caller uses `setPartytimeLogLevel("silent" | …)` or
  `setPartytimeLogger(sink)`.
- The root entry adds `checkFeedByUri` / `checkFeedByObject`, `PARTYTIME_LOG`,
  `PARSER_MAX_FEED_BODY_BYTES`, and pino output, and needs Node.

Update the existing `PARTYTIME_LOG` and `PARSER_MAX_FEED_BODY_BYTES` sentences near the top to say
they apply to the root entry.

### 12. Version and release notes

Pick the version this change ships in:

- If `release-notes/` holds a file for a version above `package.json`'s `version` (today
  `release-notes/5.2.0.md` above `5.1.0`), that release is still unpublished. Append to that file.
- Otherwise create `release-notes/<next minor>.md` with a `## <version>` heading.

Notes are technical (partytime `AGENTS.md` § Release notes). Add under `### Added`, keeping the
existing entries:

- `podverse-partytime/core`: an entry point with no Node-only imports (no `fs`, `node-fetch`,
  `dotenv`, `pino`, or `Buffer`) that runs under React Native and bundlers. Exports the parser,
  the types, and the logger controls. It reads no environment variables.
- `setPartytimeLogger` and `setPartytimeLogLevel` to route or silence parser logs.
- `Phase4LiveStatus`, `Phase4PodcastLiveItem` and `Phase4PodcastLiveItemItem` exported from both
  entries.
- `exports` map in `package.json`; deep imports under `dist/` keep resolving.

Under `### Changed`: the empty-guid warning in `getGuid` goes through the partytime logger.

Name the release-notes file you wrote in your final message. Plan 11 does not wait on that version.

### 13. Build

From `../partytime`, after the source edits:

```bash
npm run build
```

Confirm `dist/core.js` and `dist/core.d.ts` exist. Do not commit, tag, or run `release.sh`.

## Tests

Jest, in `../partytime` (operator runs them; the release script also runs them):

- `src/parser/__test__/utf8.test.ts` — `utf8ByteLength` equals `Buffer.byteLength(s, "utf8")`
  for ASCII, `é`, `€`, an emoji (surrogate pair), a lone high surrogate, a lone low surrogate,
  the empty string, and every `src/parser/__test__/fixtures/*.xml` file (use `loadFixture` from
  `./helpers` or `fs`). `exceedsUtf8ByteLimit` at the boundary: equal is `false`, one byte over is
  `true`, and both fast paths.
- `src/__test__/logger.test.ts` — import from `../core`. With a custom sink installed,
  `parseFeed("<rss")` sends `"invalid feed"` to the sink's `warn`. With `setPartytimeLogger(null)`
  and `setPartytimeLogLevel("silent")`, a `jest.spyOn(console, "warn")` sees no call; after
  `setPartytimeLogLevel("warn")` it does. Restore the sink, level, and spy in `afterEach`.
- `src/__test__/core-portability.test.ts` — `buildSync` from `esbuild` (already a devDependency)
  on `src/core.ts` with `bundle: true`, `platform: "neutral"`, `format: "cjs"`,
  `packages: "external"`, `metafile: true`, `write: false`, `outfile` set to any name,
  `logLevel: "silent"`. Assert:
  - every external import path in the metafile output matches one of `fast-xml-parser`, `he`,
    `ramda/src/<name>`, `tiny-invariant` (this catches Node built-ins, `pino`, `dotenv`,
    `node-fetch`);
  - no metafile input path ends with `src/config.ts`, `src/node-setup.ts`, `src/shared.ts`, or
    sits under `src/cor/`;
  - the bundled text matches none of `/\bBuffer\.(from|byteLength|alloc)/`,
    `/\bprocess\.env\b/`, `/\btypeof process\b/`. Do not ban the bare word `process`; person-enum
    descriptions contain it.
- Existing tests stay green unchanged, including `max-feed-body-bytes-env.test.ts` (it loads the
  root entry, which applies the env value through `node-setup`).

## Release scratchpad

none — partytime is its own repo; its notes go in `../partytime/release-notes/<version>.md`
above. The monorepo entry is in plan 11.
