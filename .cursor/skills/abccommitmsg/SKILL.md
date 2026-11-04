---
name: abccommitmsg
description: Draft a commit message for the current pending work. Use when the operator runs /abccommitmsg or says abccommitmsg. Staged files only when the index is non-empty; otherwise every unstaged change.
---

# `abccommitmsg`

Draft one commit message for the pending work, then stop. Do not stage, commit, push, or amend.
The operator pastes the command.

## What the message covers

Read `git status --porcelain` from the repo root, then:

1. **Index is non-empty** (any staged path). The message covers `git diff --cached` only, including
   partially staged hunks. Leave unstaged and untracked paths out of the message. Name them in one
   line so the operator sees they were excluded.
2. **Index is empty.** The message covers every unstaged change: tracked edits and deletions
   (`git diff`) and untracked files that are not ignored (`??` in porcelain). Read new files far
   enough to know what they add.
3. **Nothing pending.** Say the tree is clean. Do not invent a message or a commit command.

Do not propose committing secrets (`.env` with real values, keys, credentials). Name those paths
and leave them out of the message.

## How to write it

Match this repo's history: a sentence-case imperative subject, with no `feat:` / `fix:` prefix.

- Say what changed and why, in the subject. A file list is not a message.
- One concern per message. When the diff is several unrelated changes, give one message per
  concern and say they belong in separate commits.
- Add a body only when the subject cannot carry the why. Wrap the body at about 72 characters.
- Skip process notes, plan names, and "this commit".
- Look at `git log -15 --format='%s'` when the tone of nearby history would change the wording.

## GitHub issue reference

When a known GitHub issue corresponds to the pending work (from the conversation, a plan
summary, a branch name like `fix/379-…`, or an issue URL), put `#<number>` in the commit
message so GitHub links the commit to that issue. Prefer the end of the subject
(`… (#379).`) when it still reads cleanly; otherwise put `#379` on its own line at the end of
the body. Do not invent an issue number. Leave `#N` out when no issue is known.

## What to show

Lead with which set the message is for: staged, or unstaged because nothing is staged.

Write the message as prose the operator can read in full, then one fenced `bash` block labeled
**Root**. The block is the whole commit, fish-safe (**fish-operator-commands**): a single-quoted
`-m` string, apostrophes written as `\'`, no heredoc. A body is a blank line inside that same
string:

```bash
git commit -m 'Add marquee text to the web player.

Long titles scroll instead of clipping in the player bar.'
```

The prose and the `-m` text match word for word. Do not run the command.
