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

### Session 2 - 2026-02-18

#### Prompt (Developer)

Preserve comments and blank lines, and avoid doubled quotes when values are already quoted.

#### Key Decisions

- Pass through comments and blank lines as-is.
- Strip one surrounding quote pair before re-quoting values.

#### Files Modified

- infra/k8s/scripts/env-to-yaml.sh

### Session 3 - 2026-02-18

#### Prompt (Developer)

Indent output lines by two spaces and add a ConfigMap header so editors detect YAML.

#### Key Decisions

- Prefix all output lines with two spaces (including comments/blank lines).
- Emit a ConfigMap header before converting entries.

#### Files Modified

- infra/k8s/scripts/env-to-yaml.sh
- infra/k8s/scripts/README.md

### Session 4 - 2026-02-18

#### Prompt (Developer)

Append a Vim modeline so nvim detects YAML on stdin.

#### Key Decisions

- Emit a trailing YAML modeline as a comment with two-space indent.

#### Files Modified

- infra/k8s/scripts/env-to-yaml.sh
- infra/k8s/scripts/README.md

### Session 5 - 2026-02-18

#### Prompt (Developer)

update the scripts/database/combine-migrations.sh to create the infra/k8s/base/db/init-scripts.configmap.yaml file as well

#### Key Decisions

- Extend combine-migrations to emit the DB init scripts ConfigMap with the create-users script and combined SQL.
- Ensure parent directories exist before writing combined SQL or the ConfigMap.

#### Files Modified

- scripts/database/combine-migrations.sh
