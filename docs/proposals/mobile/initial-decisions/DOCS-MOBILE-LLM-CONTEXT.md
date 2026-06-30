# Keeping LLM-driven (Cursor) development effective with mobile in the monorepo

Your concern — "will adding mobile overwhelm the LLM?" — is the right thing to ask, but the answer
is **no, not if you scope context deliberately.** Cursor does not load the whole repository into the
model; it **retrieves** the files relevant to your task. A bigger repo mostly means a bigger haystack
to search, not a bigger payload per request. The real risks are narrower and each is mitigable.

## What actually degrades LLM quality (and the fix)

| Risk                                                       | Mitigation                                                                   |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Indexing huge native build trees (`Pods`, `.gradle`, etc.) | `.cursorignore` + `.gitignore` exclude them so they are never indexed.       |
| Cross-toolchain confusion (RN vs. Next vs. Node patterns)  | App-local `apps/mobile/APPS-MOBILE.md` with mobile-only conventions.         |
| Wrong-tier or wrong-app edits                              | Keep tier rules explicit; mobile is a top-tier consumer only.                |
| Generic answers that ignore the car architecture           | Point a rule/skill at the CarPlay/Android Auto doc so it is always in scope. |
| Giant files the model must read whole                      | Keep files focused and under reasonable size, as the repo already does.      |

## Concrete actions

### 1. Exclude native build artifacts from indexing

Add the heavy, generated native directories to `.cursorignore` (and ensure they are git-ignored):

```
apps/mobile/ios/Pods/
apps/mobile/ios/build/
apps/mobile/android/.gradle/
apps/mobile/android/build/
apps/mobile/android/app/build/
apps/mobile/.expo/
apps/mobile/node_modules/
```

These are machine-generated, enormous, and useless as context. Excluding them keeps retrieval
focused on your actual source.

### 2. Give mobile its own app-local guidance

Create `apps/mobile/APPS-MOBILE.md` (following the documentation-conventions full-path naming) that
states the mobile-only rules so the agent does not bleed web/Node assumptions into RN work:

- This is React Native (Expo prebuild), not Next.js — no `next/*`, no server components, no SSR.
- Which `@podverse/*` packages mobile may import (shared logic) and which it may not (web-only).
- Where native modules live and the **native cache contract** the JS side must honor (link to
  [DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md](DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md)).
- Mobile import-specifier and lint conventions if they differ from the Node tiers.

### 3. Add a focused rule/skill for the car architecture

The CarPlay/Android Auto design is the easiest thing for an LLM to get wrong (it will default to
"just use react-native-track-player" and miss the native-cache requirement). A short rule that
triggers on `apps/mobile/**` and links to the car doc keeps the correct architecture in context
whenever mobile playback code is edited.

### 4. Keep the build graph separated (also helps the LLM)

Because `apps/mobile` is **off** the Node `build:packages` / app build order
([DOCS-MOBILE-MONOREPO-DECISION.md](DOCS-MOBILE-MONOREPO-DECISION.md)), the agent will not conflate
mobile build commands with server build commands, and "how do I build X" stays unambiguous.

### 5. Prefer per-app work sessions

When working on mobile, point the agent at `apps/mobile` and the shared packages it uses. When
working on servers, stay in those trees. This is good practice in any large monorepo and keeps each
session's retrieval tight and relevant. Subagents scoped to one area (e.g. an `explore` agent for
"how does the native cache get written?") keep the main context clean.

## Why the monorepo is actually _better_ for LLM workflows here

- **Shared types in context.** When the agent edits a mobile API call, the same `@podverse/helpers`
  DTO is right there — it cannot drift from a copy in another repo it cannot see.
- **One set of conventions.** Your `.cursor` rules/skills apply uniformly; you are not re-teaching
  the agent a second repo's norms.
- **Atomic, reviewable changes.** A DTO + web + mobile change is one diff the agent can reason about
  end to end, instead of coordinating edits across repos it would have to be told about separately.

A separate repo would _shrink_ each repo but would also **hide the shared contracts** from the agent
when working in the other repo — often a net loss for correctness.

## Bottom line

Adding mobile will not overwhelm Cursor as long as you (1) `.cursorignore` the native build output,
(2) give `apps/mobile` its own `APPS-MOBILE.md` and a car-architecture rule, and (3) keep mobile off
the server build graph. Done this way, the monorepo is the _better_ environment for LLM-driven work
because the shared contracts stay visible and the conventions stay singular.
