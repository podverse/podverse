# Env to YAML

**Started**: 2026-02-18  
**Context**: Convert .env files to YAML-style key/value pairs

---

### Session 1 - 2026-02-18

#### Prompt (Developer)

Create a bash script in infra/k8s/scripts to convert docker env-style files into YAML style, taking a file path argument.

#### Key Decisions

- Implement conversion with bash string handling and no new dependencies.
- Skip blank/comment lines and warn on malformed entries.

#### Files Modified

- infra/k8s/scripts/env-to-yaml.sh
- infra/k8s/scripts/README.md
