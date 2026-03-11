# Feature: K8s yamllint cleanup

## Metadata

- Started: 2026-03-04
- Completed: In Progress
- Author: suorcd
- LLM(s): OpenCode
- GitHub Issues: None
- Branch: feature/mr00
- Origin: git@github.com:suorcd/podverse.git
- Is Fork: yes

## Context

Clean up yamllint warnings in K8s worker deployment manifests.

## Sessions

### Session 1 - 2026-03-04

#### Prompt (Developer)

fix
brentano@devOne ~/w/g/s/p/f/mr00 (feature/mr00)> yamllint infra/k8s/base/workers/parser-ondemand.deployment.yaml
infra/k8s/base/workers/parser-ondemand.deployment.yaml
1:1 warning missing document start "---" (document-start)
73:14 warning missing starting space in comment (comments)
94:7 warning comment not indented like content (comments-indentation)

brentano@devOne ~/w/g/s/p/f/mr00 (feature/mr00)> yamllint infra/k8s/base/workers/parser-normal.deployment.yaml
infra/k8s/base/workers/parser-normal.deployment.yaml
4:1 warning missing document start "---" (document-start)
76:14 warning missing starting space in comment (comments)
97:7 warning comment not indented like content (comments-indentation)

brentano@devOne ~/w/g/s/p/f/mr00 (feature/mr00)>

brentano@devOne ~/w/g/s/p/f/mr00 (feature/mr00)> yamllint infra/k8s/base/workers/parser-live.deployment.yaml
infra/k8s/base/workers/parser-live.deployment.yaml
1:1 warning missing document start "---" (document-start)
73:14 warning missing starting space in comment (comments)
94:7 warning comment not indented like content (comments-indentation)

brentano@devOne ~/w/g/s/p/f/mr00 (feature/mr00)>

brentano@devOne ~/w/g/s/p/f/mr00 (feature/mr00)> yamllint infra/k8s/base/workers/parser-add-by-rss-ondemand.deployment.yaml
infra/k8s/base/workers/parser-add-by-rss-ondemand.deployment.yaml
1:1 warning missing document start "---" (document-start)
77:14 warning missing starting space in comment (comments)
77:13 warning comment not indented like content (comments-indentation)

brentano@devOne ~/w/g/s/p/f/mr00 (feature/mr00)>

brentano@devOne ~/w/g/s/p/f/mr00 (feature/mr00)> yamllint infra/k8s/base/workers/parser-add-by-rss-ondemand-background.deployment.yaml infra/k8s/base/workers/listener-live.deployment.yaml
infra/k8s/base/workers/parser-add-by-rss-ondemand-background.deployment.yaml
1:1 warning missing document start "---" (document-start)
77:14 warning missing starting space in comment (comments)

infra/k8s/base/workers/listener-live.deployment.yaml
2:1 warning missing document start "---" (document-start)
67:14 warning missing starting space in comment (comments)
88:7 warning comment not indented like content (comments-indentation)

brentano@devOne ~/w/g/s/p/f/mr00 (feature/mr00)>

#### Key Decisions

- Added document starts, fixed comment spacing, and reflowed command arrays to satisfy yamllint line-length rules.
- Removed commented-out blocks that failed indentation lint rules in the worker manifests.

#### Files Changed

- infra/k8s/base/workers/image-shrink-consumer.deployment.yaml
- infra/k8s/base/workers/listener-live.deployment.yaml
- infra/k8s/base/workers/parser-add-by-rss-ondemand-background.deployment.yaml
- infra/k8s/base/workers/parser-add-by-rss-ondemand.deployment.yaml
- infra/k8s/base/workers/parser-live.deployment.yaml
- infra/k8s/base/workers/parser-normal.deployment.yaml
- infra/k8s/base/workers/parser-ondemand.deployment.yaml

---

## Prompt Source Reference

- `#### Prompt (Developer)` — Manually typed by the user
- `#### Prompt (Agent)` — System-generated (e.g., clicking "Build" on a plan)

## Outcome

- Fixed yamllint warnings in worker deployment manifests.
- Standardized comment formatting and command array layout for linting.
