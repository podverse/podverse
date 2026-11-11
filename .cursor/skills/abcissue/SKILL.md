---
name: abcissue
description: Plan work from a pasted issue URL or path (GitHub or another tracker). Use when the operator runs /abcissue, says abcissue, or pastes an issue to be planned. Asks before guessing, then writes a small plan set or an abcplan request on the current branch.
---

# `abcissue`

An issue paste becomes a plan and a short reply for the thread. This chat does not implement
the issue and does not post the reply.

## When it applies

- The operator says **abcissue** or runs `/abcissue`.
- They paste an issue URL or a path to an issue, and the message is to plan or fix it. A paste
  with no other instruction means this skill.
- A paste that only asks for an explanation, a status check, or a reply with no code stays that
  request.

Read the issue before asking or planning. For GitHub, `gh issue view <number> --comments`. For a
file path, read the file. For another tracker, fetch the page. Read the comments. They are who
the reply is for.

Write the set in the checkout this chat is editing, on the current branch. Do not add it to a
worktree that belongs to another issue.

## Ask first

Ask before writing plans when you are unsure how to build it, whether it should be built, or
about anything else the operator should weigh. Use `AskQuestion` for a choice. Ask an open doubt
in the message, in a sentence or two.

Lead with a recommendation when you have one, including "do not build this" and why. A decline
gets a drafted reply and no plan set until the operator says to build it.

Do not ask what the code already answers. When a question is open, stop the turn. Write the
plans after the answers, or in the same turn when nothing is open.

## Size

Same split as **abcplan**.

- **Small** — one or two plans you can write from the issue and a short look at the code. Write
  the set here. The operator implements it in a chat on this branch. Do not give
  `./scripts/abcplan/run.sh`.
- **Large** — several surfaces, several unrelated asks, or a research pass. Write only
  `00-REQUEST.md` and give the plan command for this checkout. Planning and implementation then
  run as **abcplan** in this checkout. **abcplan**'s fresh-worktree step does not apply.

Issues that could ship separately get separate slugs. Give the plan command for each slug. Do
not open a worktree per slug unless the operator asked for worktrees.

## Names

Plan folder: `.llm/plans/active/<number>-<short-slug>/`.

A branch, only when the operator asked for a worktree, uses a prefix the pre-push hook allows:
`feature/` for new behavior, `fix/` for a defect, `chore/` for internal work. The issue number
is the first segment after that prefix.

## Small set

- One numbered plan per change. One change per plan. Use the **abcplan** § Area plan headings
  (model line, `## Files`, `## Tests`) plus `## Ticket reply` as specified below.
- `COPY-PASTA.md`, one prompt per plan, for pasting into a chat on this branch. Each prompt
  starts with `Read and execute .llm/plans/active/<slug>/<plan>.md`, then: if a product choice
  is still open, stop and ask; draft the ticket reply; do not post it; do not run tests. The
  prompt ends with the operator verify commands (**response-ending-make-verify**). The plan's
  `## Tests` names the specs and has no command block.

Follow **copy-pasta-recommend-model**, **llm-safe-plan-vocabulary**, and
**feature-implementation-testing**.

Tell the operator to paste the first prompt into a chat on this branch. One agent per prompt.
Paste the next after any prompt it shares files with has finished.

## Large set

`00-REQUEST.md` follows **abcplan** § Request file. Quote the issue and include its URL. Add a
**Ticket reply** section that says: this is an operator deliverable, not a product change; the
last implementation step writes `proposed-reply.md` in the set and repeats it in a fenced `text`
block; the operator pastes it after the pull request is on `develop`; do not post it; a few
sentences for the people in the thread, with no file names or plan names.

Give this command for the **Root** tab of this window. Do not create a worktree first.

```bash
./scripts/abcplan/run.sh plan <number>-<slug>
```

After that planning run, the operator reviews the set, then runs `run` the way **abcplan**
describes, still in this checkout.

## Ticket reply

The last step of the work drafts the comment. The operator edits it if needed and pastes it on
the issue after the change is merged to `develop`.

- A few sentences. What the reporter or the thread can do now, or what we will not do.
- Name a pull request only when it helps them.
- No file lists, plan numbers, or refactors.
- Write `proposed-reply.md` in the set, and put the same text in a fenced `text` block in the
  final message.
- Do not run `gh issue comment` or any other write.

A decline, with no plan set, is the reply in the chat only.

## Worktree

Stay on the current branch. Do not create a worktree, and do not give the worktree command
blocks, unless the operator asks for a worktree in that message.

When they do, read **git-worktree-sibling** § Plan sets in a worktree and give those two blocks.
Lead with **Fresh worktree required**. If a worktree or branch for that issue number already
exists (`git worktree list`), say so and do not open a second one.

```bash
git worktree add -b feature/<number>-<slug> ../podverse_feature_<number>_<slug_underscored> develop
```

Use `fix` or `chore` in both the branch and the directory when that is the prefix. Move only
this set's folder.

Block 2 of a **small** set stops after `make local_env_worktree_setup` and `npm run deps:init`.
Tell the operator to open a chat in that window and paste the first `COPY-PASTA.md` prompt. One
agent per prompt. Paste the next after any prompt it shares files with has finished.

Block 2 of a **large** set ends with:

```bash
./scripts/abcplan/run.sh plan <number>-<slug>
```

After that planning run, the operator reviews the set, then runs `run` the way **abcplan**
describes.

## Related

- **abcplan** — large issues, and the plan headings a small set still uses. Its worktree step
  applies only when the operator asked for a worktree.
- **git-worktree-sibling** — the two command blocks, only after the operator asks for a worktree
- **github** — read-only `gh`. The operator posts the reply
