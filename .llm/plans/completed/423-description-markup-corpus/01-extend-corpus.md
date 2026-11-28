# Stored descriptions reject markup outside the allowlist

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

## Issue

https://github.com/podverse/podverse/issues/423

## Rows

- **R1** A stored description and the rich tree read back from it stay inside the existing allowlist.

## Runs after

none

## Alpha GitOps (k.podcastdj.com)

None. No env key, no logout, and no migration. A parser fix, if a test forces one, ships
inside the worker and API images. Alpha picks it up on the normal ref bump.

## Review before running

No operator question. The parser already has an allowlist. This plan adds tests. Change
`descriptionDocument.ts` only when a new test shows a case that survives into the stored
markdown or the rich tree.

## Files

- `packages/helpers/src/lib/descriptionIngest.test.ts`
- `packages/helpers/src/lib/descriptionDocument.ts` only if a new test fails
- `packages/helpers/src/lib/descriptionMarkdown.ts` only if a new test fails

## Tests

Add cases to `descriptionIngest.test.ts` through `prepareDescriptionForStorage` and
`readDescriptionDocument`. For each case, the stored `value` and the rich tree must not
contain a tag name outside the allowlist, an attribute whose name starts with `on`, or a
link scheme other than `http`, `https`, and `mailto`.

Cases to add, beside the script, style, `javascript:`, and `data:` cases that already exist:

- An image tag with an `onerror` attribute and a `src`.
- An `svg` tag.
- An `iframe` tag.
- A link whose scheme is `javascript` with mixed case and a tab or newline after the colon.
- A protocol-relative link (`//` host).
- An HTML comment that wraps a disallowed tag.
- A truncated tag in the lenient path.

Do not add a second parser. Do not add a Playwright spec.

## Release scratchpad

none, unless a parser fix changes what a normal show description stores. If it does, append
an entry that names the visible change. A test-only change gets no entry.

## Work

Read `buildDescriptionTree`, `prepareDescriptionForStorage`, and the existing tests in
`descriptionIngest.test.ts` before adding cases. Match the style of the test that drops
script and style.

A failure means the stored string or the rich nodes still carry the disallowed piece.
Fix that path. A case that becomes plain text, or loses the link and keeps the words, is
a pass.

## Ticket reply

Save as `proposed-reply.md`. Do not post it. After the change is on `develop`, post it
and close issue 423.

```text
Feed descriptions are still stored through the same allowlist. The tests now cover more
hostile markup, including event-handler attributes, unexpected tags, and link schemes
other than http, https, and mailto. A description that does not pass is stored without
that markup.
```

If a parser fix was required, add one sentence naming what no longer survives. Do not
name files.

## Done

Search issue 423 again before the first edit. Do not run tests. Do not commit. Do not
comment on or close the issue. Write `proposed-reply.md`, move this directory to
`.llm/plans/completed/423-description-markup-corpus/`, and give the operator the
verification command from COPY-PASTA plus fish-safe git commands. The close
recommendation is only for after `develop`.
