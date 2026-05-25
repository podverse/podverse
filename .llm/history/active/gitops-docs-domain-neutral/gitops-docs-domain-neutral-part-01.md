# gitops-docs-domain-neutral

## Context

Operator-specific GitOps hostnames removed from contributor-facing Podverse docs in favor of generic “your GitOps repository” wording.

---

### Session 1 - 2026-05-01

#### Prompt (Developer)

we also do not want k.podcastdj.com mentioned within the podverse monorepo, and we do not want metaboost.cc mentioned within the metaboost monorepo, because these are open source projects and other developers will not be using those domains. if you need to talk about the separate GitOps repo, you should refer to them more generically like "the GitOps repo" or however you think best explains it

#### Key Decisions

- Replaced `k.podcastdj.com` examples in `DB-MIGRATIONS.md` with generic `apps/<environment>/ops/kustomization.yaml` under the operator’s GitOps repo.
- Updated `.cursor/skills/k8s/SKILL.md` to say “separate GitOps repository checkout” instead of naming a hostname.

#### Files Created/Modified

- `docs/operations/database/DB-MIGRATIONS.md`
- `.cursor/skills/k8s/SKILL.md`
- `.llm/history/active/gitops-docs-domain-neutral/gitops-docs-domain-neutral-part-01.md`
