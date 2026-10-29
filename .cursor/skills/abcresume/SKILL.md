---
name: abcresume
description: Give the operator copy-paste resume commands for a plan-runner run that stopped for an answer. Use when the operator runs /abcresume or says abcresume, usually with the stopped run's terminal output attached.
---

# `abcresume`

A plan-runner run (abcplan, abctest, abcbranchesmerge, or a plain plan set) stops when a step
reports
`RUNNER-STATUS: BLOCKED`. Nothing else starts until the operator continues that same agent with
`--resume`. **abcresume** turns the stop into one ready-to-paste resume command per reasonable
answer. Do not run the commands. The operator picks one.

## Find the stop

1. Run `node scripts/abcresume/find-stops.mjs` from the repo root. It reads the runner's
   `state.json` for every set and prints, per waiting run, the wrapper to resume through and each
   blocked step with its reason and final-message path. Trust it over the newest file or the first
   unticked box: parallel steps finish in any order.
   The script reads only the checkout it runs in. A run in a sibling worktree is answered from a
   chat in that worktree's Cursor window (**git-worktree-sibling** § Plan sets in a worktree).
   When it finds no waiting run here but `git worktree list` shows sibling worktrees, or attached
   output shows a run in one, name that worktree and ask the operator to run `/abcresume` in its
   window.
2. Attached terminal output only picks which run is meant when the script lists more than one.
3. Read each blocked step's final message in full. It holds the question, the options, the
   agent's own view of each, and what each option changes. If the message is unclear, read the
   plan files it names before writing the options.

## How the runner takes a resume

- Resume through the wrapper the script prints, so the wrapper's checks still apply. Append
  `--resume '…'` to it.
- `--resume` reaches only the first blocked step. With several blocked, the run stops again after
  that one and the next is first. Give one resume command per blocked step, in the script's order,
  and say they run one after another.
- A step blocked with `interrupted by operator` was cancelled mid-run, not asking anything. One
  command resumes it: `--resume 'Continue where you stopped.'`
- `--clear` drops every blocked entry at once. Any step that was not ticked by hand then reruns
  from scratch with a fresh agent, losing its context.
- A run the script reports as not blocked but with unticked steps ended without a recorded stop.
  Rerun its wrapper with no flags.

## Write the reply

- **Lead with the stop** in one or two sentences: which step, what it needs decided, and that
  everything else in the run is done or waiting.
- **One fenced `bash` block per option**, labeled **Root**, each preceded by a one-line
  description and the agent's view of it (recommended, optional, advised against, and why).
  Cover the options the agent listed, plus a "none of these" or "keep as written" option when
  that is a real answer.
- **Mark the recommendation** when there are two or more options. Put the recommended option
  first and add "(Recommended)" to its heading. When the blocked agent's view and yours differ, or
  the agent recommended more than one, pick one and say why in a sentence. When no option stands
  out, say that instead.
- **Show the resume message twice.** The code-block viewer puts the command on one line and cuts
  off the end, so first write the message as plain prose (a blockquote) the operator can read in
  full, then the copy-paste command block with that exact text. The two must match word for word.
- **The resume message is the whole instruction.** The resumed agent sees nothing from this chat.
  Say the decision, what to leave out, and which files to update (plans, ledger rows). Keep it to
  one or two sentences.
- **Fish-safe:** one single-quoted string, no heredoc (**fish-operator-commands**). Write
  apostrophes as `\'` or reword to avoid them.
- Name the items the agent advised against and why, so the operator does not pick one by accident.
- **Manual alternative:** when the operator did the blocked work by hand, they tick that step's
  box in the set's `COPY-PASTA.md` and run the same wrapper with `--clear`. Say when this is
  worse than resuming (for example, a ledger row would stay open), and warn when other steps are
  blocked too, since `--clear` drops them as well.
- **After the resume:** say what runs next and what to review before the following command. For
  an abcplan planning run, that is the Close step, then reviewing `00-SUMMARY.md`, `COPY-PASTA.md`,
  and the "choices you may want to reverse" from earlier final messages, then
  `./scripts/abcplan/run.sh run <slug>`. Name any conflict an earlier step left for Close to
  settle.

Ask with `AskQuestion` only when the script finds no waiting run, or lists more than one and no
attached output says which is meant.
