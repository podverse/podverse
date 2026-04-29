# Alpha namespace teardown script

Started: 2026-04-30
Author: Agent
Context: Interactive script for ALPHA-NAMESPACE-FULL-TEARDOWN runbook.

---

### Session 1 - 2026-04-30

#### Prompt (Developer)

@podverse/docs/development/k8s/ALPHA-NAMESPACE-FULL-TEARDOWN.md:1-173 i want you to convert the teardown into a script with prompts that i can enter the values for and have the script complete the full teardown for me

#### Key Decisions

- Added `scripts/k8s/alpha-namespace-full-teardown.sh`: prompts for context, server fragment, target pattern, namespaces; cluster gates; inventory; Argo app deletes (reverse order per doc); namespace delete with typed confirmation; optional PV deletion; `--dry-run` and `-y`.
- Documented scripted path at top of `ALPHA-NAMESPACE-FULL-TEARDOWN.md`; kept fish runbook as “Manual runbook”.

#### Files Created/Modified

- `scripts/k8s/alpha-namespace-full-teardown.sh`
- `docs/development/k8s/ALPHA-NAMESPACE-FULL-TEARDOWN.md`
- `.llm/history/active/alpha-namespace-teardown-script/alpha-namespace-teardown-script-part-01.md`
