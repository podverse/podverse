# Feature: v4v-boost-metadata-alby (Part 4)

> **Note**: This LLM history file is optional. If you're not using LLM assistance for development, you can delete this file and the containing directory. The history tracking system helps document LLM-assisted decisions but is not required for contributing.
>
> **10-Session Limit**: Each part file is limited to 10 sessions. When adding Session 41, create `v4v-boost-metadata-alby-part-05.md`.

## Metadata

- Started: 2026-02-24
- Completed: In Progress
- Author: Mitch Downey
- LLM(s): Cursor, Claude, etc.
- GitHub Issues: https://github.com/podverse/podverse/issues/47
- Branch: feature/v4v-boost-metadata-alby
- Origin: git@github.com:podverse/podverse.git
- Is Fork: no

## Context

[Continuation of V4V local LN reliability fixes and follow-up debugging.]

## Sessions

### Session 31 - 2026-02-24

#### Prompt (Developer)

assess the terminal logs, then make the changes needed to fix @/Users/mitcheldowney/.cursor/projects/Users-mitcheldowney-repos-pv-pv-code-workspace/terminals/21.txt:863-1029

#### Key Decisions

- Root cause confirmed from logs: recipient-node `lncli` commands were still defaulting to `/root/.lnd` while recipient containers now run with `--lnddir=/data/.lnd`.
- Fixed recipient-node scripts by passing `--lnddir=/data/.lnd` for all `docker exec "$container" lncli ...` calls used in readiness checks and recipient pubkey discovery.
- Limited scope to recipient-node script paths only; main Nigiri `lnd` commands remain unchanged.

#### Files Modified

- /Users/mitcheldowney/repos/pv/podverse/.llm/history/active/v4v-boost-metadata-alby/v4v-boost-metadata-alby-part-04.md
- /Users/mitcheldowney/repos/pv/podverse/scripts/v4v/btc/ln/provision-ln-recipient-nodes.sh
- /Users/mitcheldowney/repos/pv/podverse/scripts/v4v/btc/ln/discover-recipients.sh

### Session 32 - 2026-02-24

#### Prompt (Developer)

Fix `local_nuke_rebuild_run_v4v` LN Provisioning Failure

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Added resilient recipient channel provisioning with bounded reconnect + openchannel retries to handle transient peer disconnects during `local_ln_up`.
- Added peer-state diagnostics on channel-open failure (`listpeers` snapshot + attempt output) to improve debuggability when provisioning fails.
- Found a deeper root cause from runtime logs (`Block height out of range`) due stale external recipient volumes surviving cleans; updated `local_ln_clean` to explicitly remove recipient volumes.
- Tightened recipient readiness checks to require `synced_to_chain=true` instead of only RPC availability before funding/channel steps.
- Verified success with `nix develop .#v4v --command make local_ln_up` and confirmed the full `local_nuke_rebuild_run_v4v` path advances past `local_ln_up` recipient provisioning.

#### Files Modified

- /Users/mitcheldowney/repos/pv/podverse/.llm/history/active/v4v-boost-metadata-alby/v4v-boost-metadata-alby-part-04.md
- /Users/mitcheldowney/repos/pv/podverse/scripts/v4v/btc/ln/provision-ln-recipient-nodes.sh
- /Users/mitcheldowney/repos/pv/podverse/Makefile.local.v4v
