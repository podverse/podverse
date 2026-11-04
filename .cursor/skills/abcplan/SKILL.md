---
name: abcplan
description: Turn an operator request into a plan set that plan-runner executes, choosing a model per prompt. Use when the operator runs /abcplan or says abcplan, and in every step of an abcplan planning run.
---

# `abcplan`

**abcplan** turns a request into a plan set under `.llm/plans/active/<slug>/` and hands the
operator the commands that run it with plan-runner: one fresh agent per prompt, each on the model
the plan chose. It does not implement in the invoking chat.

The models are not fixed. Every prompt, planning or implementation, gets the least expensive
eligible model and the lowest reasoning that can reliably do it, per
**copy-pasta-recommend-model**.

Both runs pass `--parallel` to plan-runner: every pending prompt under the first pending `##`
heading runs at once. That is safe because planning steps under one heading write separate plan
files, and Assemble puts implementation prompts under one heading only when they edit disjoint
files.

## When the operator invokes it

1. Pick a slug for the set: lowercase words joined by hyphens, naming the work, not the date.
1. Ask the questions only the operator can answer: product decisions, scope between surfaces,
   anything two readings of the request would build differently. Use `AskQuestion`. Look at the
   code only as far as the questions need. Questions a planning agent can answer from the code
   are left to that agent.
1. Decide the size.
   - **Small**: the whole request fits one or two plans you can write from what is already in
     context. Write the set in this chat (**parallel-plan-execution**, one change per plan per
     § Area plan), then give the run command.
   - **Large**: anything else, including any request with several surfaces or several unrelated
     asks. Write only `00-REQUEST.md` (§ Request file) and give the plan command. The planning
     run does the research, so this chat keeps no more context than the questions needed.
1. Reply with the commands for the operator to run next, in the two-block worktree format of
   **git-worktree-sibling** § Plan sets in a worktree. Every set gets a fresh worktree off
   `develop` before its planning run, so planners research the code the implementers will edit.
   Block 1 (**Root** tab of this window) creates the worktree, moves only this set's folder into
   it, allows its `.envrc`, and opens it in a new Cursor window. Block 2 (**Root** tab of the
   worktree's window) sets up the env and deps and runs the set. When the request holds asks that
   could ship separately and share no files, recommend separate slugs, one `00-REQUEST.md` and
   one worktree each, and give every block 1 before any block 2.

Large request, last line of block 2:

```bash
./scripts/abcplan/run.sh plan <slug>
```

After the planning run finishes, the operator reads `00-SUMMARY.md` and `COPY-PASTA.md` in the
set, edits anything they disagree with, then runs, in the same worktree window:

```bash
./scripts/abcplan/run.sh run <slug>
```

A small request's block 2 ends with that `run` line instead.

Tell the operator, briefly:

- First time on a computer: `npm --prefix ../plan-runner install`, then
  `node ../plan-runner/run-plan-set.mjs --login`.
- When a step stops with a question, answer by continuing that same agent:
  `./scripts/abcplan/run.sh plan <slug> --resume 'Your answer.'` (or `run` for the
  implementation run). Running `/abcresume` then gives the ready-made commands, each with its
  message also written out as readable prose (**abcresume** skill). Ask in a chat of the
  worktree's window, and run the resume there.
- Plan sets running in parallel worktrees collide on migration numbers and share the test
  infrastructure; see **git-worktree-sibling** § Across parallel worktrees.
- Each step's final message is saved in `.artifacts/plan-runner/<set>/`. The planning run's
  Close message lists the open questions and the run command. The implementation run's last
  message holds the cumulative verification.

### Operator notes for parallel runs

- Runner output is quieter in parallel mode. A step's full text is in
  `.artifacts/plan-runner/<set>/NN.log`.
- When a step in a parallel group asks a question, the other steps in the group still finish and
  are ticked. Nothing under the next heading starts.
- The question appears once every step in the group has finished.
- Each `--resume 'answer'` goes to the oldest waiting step. When two steps asked, the command
  prints the second question after the first step finishes; answer it with another `--resume`.
- `--clear` drops every waiting step at once. Use it only after finishing all of them by hand.

## Request file

`.llm/plans/active/<slug>/00-REQUEST.md` is the only input the planning run gets. Nothing from
the invoking chat reaches it otherwise.

- **Request**: the operator's words, verbatim, split into paragraphs. Do not summarize, reorder,
  or drop anything. Leave out only instructions about abcplan itself.
- **Operator answers**: each question you asked and the answer, in the operator's terms.
- **Glossary**: speech-to-text spellings and what they mean (for example "AdByRSS" is Add by
  RSS).
- **Orientation**: files you already found that a planner should start from, with one line each.
  Only facts you checked.
- **Ticket reply**: only when **abcissue** wrote the file. An operator deliverable for the last
  implementation step, not a product change. Keep it as a ledger row the last plan covers.

## Planning steps

The planning run is a separate set, `.llm/plans/active/abcplan-<slug>/` (gitignored, removed when
the implementation run starts). Its steps come from
[plan-COPY-PASTA.md](/.cursor/prompts/abcplan/plan-COPY-PASTA.md). Every step:

- Reads `00-REQUEST.md` in full, then `00-SUMMARY.md` once it exists.
- Greps the `## Notes for later prompts` section of every earlier final message in
  `.artifacts/plan-runner/abcplan-<slug>/`. It reads a full final message or another area's plan
  only for the steps its own prompt names as dependencies, or for a plan it edits.
- Changes no product, test, or guidance code and runs no tests. It writes only inside
  `.llm/plans/active/<slug>/` and the planning set's `COPY-PASTA.md`.
- Does not run Prettier, align tables, or rewrap lines in plan files. Nothing checks formatting
  under `.llm/plans/`; tables need valid pipes, not padding.
- Reports `RUNNER-STATUS: BLOCKED — <question>` only for a product decision the request and
  answers leave open. It finishes what does not depend on the answer first, and writes the full
  question, the options, and what each option changes in its final message.
- Follows **llm-safe-plan-vocabulary** in everything it writes.

### Split (step 01)

Write `00-SUMMARY.md` with a **requirement ledger**: one row per distinct ask in the request,
numbered R1, R2, …, quoting the request's own words. One sentence that asks for three things is
three rows. Asides count: "Do any of the list rows display the blue dot?" is a row whose answer
goes in a plan. Write each row as one list item, so Grep and a one-line edit find and change it:

```markdown
- **R12** (area C) "the request's words" — Plan: (pending)
```

Group rows into **areas**. An area is work one planning agent can research and specify without
running out of context: one screen family, one surface, or one shared component and its callers.
Keep a row whose fix lives in a shared component in that component's area, even when the request
mentions it under another screen.

For each area, record in `00-SUMMARY.md`: its rows, the code it starts from, the areas it depends
on, the files it shares with other areas, and its **plan number block** (area A owns `10–19`,
area B owns `20–29`, and so on), so area steps never collide on file names.

Group areas into **waves**. An area goes in a later wave only when its plan builds on another
area's plan: it edits the same file, or uses a route or component that area creates. Everything
else goes in wave 1. Replace the template's `## Area plans` heading with one heading per wave,
`## Area plans — wave 1`, `## Area plans — wave 2`, …, above `## Review`. Under each, insert one
step per area, numbered 02, 03, … in wave order. Each step uses the template's three-part shape:
an unticked checkbox line with a bold `NN — Plan <area>` title, a
`**Cursor model:** … · **Reasoning:** …` line, then a fenced prompt that says, in order:

- "You are step NN of abcplan planning run <set>. Follow .cursor/skills/abcplan/SKILL.md
  § Planning steps and § Area plan."
- "Your area is <area>. Your rows are R…, R…. Your plan number block is NN–NN."
- "You depend on steps NN, NN (plans NN–NN)." or "You depend on no other step."
- One sentence on where to start in the code.

Choose each step's model by how much design the **planning** needs, using the
**copy-pasta-recommend-model** table: Opus 5.5 when the area leaves architecture or behavior open
or spans surfaces; Cursor Grok 4.7 when the area follows an existing pattern. Do not tick any
checkbox.

### Area plan

Research the code for your rows, then write numbered plans in your block, `NN-<short-name>.md`.

**One change per plan.** A plan holds one coherent change one agent can finish. Split it when it
holds changes that could ship separately, or when its `## Files` list spans unrelated areas. Never
trim a plan to hit a length. Past about 500 lines, check whether it is really two changes; that is
a check, not a stop.

Each plan opens with its `**Cursor model:** … · **Reasoning:** …` line for the
**implementation**, then has these exact headings, which Assemble greps. Other sections are
free-form.

- `## Rows` — the ledger rows it covers, as `R12, R14`.
- `## Runs after` — plan numbers it must follow, or `none`.
- `## Files` — every file it creates or edits, one path per line.
- `## Tests` — unit, API integration, Playwright spec, or Maestro flow it adds or updates, per
  **feature-implementation-testing** and **mobile-test-economics**. No operator command block.
- `## Release scratchpad` — the `release-notes/scratchpad.md` entry to append when it changes a
  shipped surface, or `none`.

The plan also:

- Names exact file paths and anchors (symbol, route, key prefix) for files listed in
  **large-file-reading**.
- Resolves every either/or when it goes to Cursor Grok 4.7, so the implementer transcribes
  decisions.
- States reuse: the shared component it extends or the parity source it copies (for Add by RSS
  versus database content, the non-Add-by-RSS screen is the source of truth unless the request
  says otherwise).

Choose the implementation model from the **copy-pasta-recommend-model** table by what kind of
change it is, not by how detailed the plan is. A detailed plan does not move a concurrency change,
an identity or contract change with many callers, or a destructive migration down to Grok. For a
Grok prompt, pick its reasoning from that rule's § Reasoning table, per prompt.

Answer question rows from the code ("does the row show the dot?") in the plan that owns them,
then plan the change the answer implies. Do not edit `00-SUMMARY.md`; steps in one wave run at
once, and Close fills the ledger from each plan's `## Rows`.

End your final message with:

- `## Plans` — the plans you wrote and the files they share with other areas.
- `## Decisions` — product choices the request did not settle. Each item gives the choice made,
  the main alternative, and the plan it is in. Leave out choices that only follow the parity
  source. Write `none` when there are none.
- `## Notes for later prompts` — what a later step must know, or `none`.
- Any row you could not plan, and why.

### Decision review (Review step)

The `## Review` step runs after the last wave and before `## Assemble`, so the operator corrects
planner choices once, before the set is assembled.

- Collect every `## Decisions` list from the area steps' final messages into a
  `## Decisions to review` section of `00-SUMMARY.md`, each item naming its step and plan.
- When every list is `none`, report DONE.
- Otherwise report `RUNNER-STATUS: BLOCKED — review planner decisions`, with the list in the
  final message.
- On resume, follow § Revising after operator review for the first planning pass.

### Assemble (Close)

Write `.llm/plans/active/<slug>/COPY-PASTA.md` and `00-EXECUTION-ORDER.md` from every plan in
the set, per **parallel-plan-execution** and **copy-pasta-recommend-model**:

- Grep `## Rows`, `## Runs after`, and `## Files` from every plan. Open a full plan only to
  settle a file conflict, a missing row, or an ordering question.
- Fill each ledger row's Plan from the plans' `## Rows`. Every row maps to at least one plan, or
  to an open question in the final message. A row with neither means a plan is missing. Write it,
  or stop and report BLOCKED.
- Every plan holds one change (§ Area plan) and carries its model line. Split any that holds two.
- Order phases by `## Runs after`. Put prompts under one phase heading only when their `## Files`
  are disjoint, counting the shared files in **parallel-plan-execution** § Shared files. Under
  each phase with several prompts, name the files each prompt owns.
- In a phase with several prompts, each prompt puts its release-notes entry in its final message
  (**release-notes-scratchpad**); the set's last prompt runs alone and appends them.
- Each prompt fence starts with `Read and execute .llm/plans/active/<slug>/<NN-plan>.md`. Its
  model line copies the plan's.
- Include the plan-runner line under "How to use", naming `./scripts/abcplan/run.sh run <slug>`.
- The last prompt archives the set and carries the cumulative verification for the whole set
  (**response-ending-make-verify** § Plan sets).
- When the request has a Ticket reply section, that last prompt also writes `proposed-reply.md`
  in the set and repeats it in a fenced `text` block. It does not post the comment. The operator
  pastes it after the change is on `develop`. See **abcissue**.

The final message lists, in this order: the phases with their prompts and models, the open
questions, and the command `./scripts/abcplan/run.sh run <slug>`.

### Revising after operator review

This applies to the Review step's resume and to any review after Close. The first review is of
the first planning pass, and so on.

- Record the answers in `00-REQUEST.md` under `### Review of the <nth> planning pass`, quoting
  the operator where a quote settles the choice.
- Add new ledger rows to `00-SUMMARY.md`, continuing the R numbers, each naming its area and
  planning step, plus a short pass note under `## Order`.
- In the planning run's `COPY-PASTA.md`, add `## <Nth> pass after the <nth> review` above
  `## Assemble`, with unticked steps in the usual step format, each naming its rows, its plan
  files, and its dependencies. Steps under one heading run at once, so steps that edit the same
  plan become one step or go under separate headings.
- After Close has run, untick it and add to its prompt that it rewrites both set files from
  scratch and that every listed review answer is settled.
- Deferred items get `.llm/plans/active/<topic>-deferred/00-SUMMARY.md`: the gap, why it waits,
  and the questions to settle first.
- Edit plans by hand only for small fixes. Send larger amendments through planning steps.

## Implementation run

`./scripts/abcplan/run.sh run <slug>` runs the set's `COPY-PASTA.md` with plan-runner, in
parallel by phase. Its prompts are ordinary plan-set prompts: they follow the plans, do not run
tests, and append release-note entries, except in a phase with several prompts (§ Assemble).
The script refuses while the planning run still has unticked steps.
