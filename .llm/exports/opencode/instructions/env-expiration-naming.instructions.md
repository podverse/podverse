---
description: "Names ending in _EXPIRATION (env + exported constants) use seconds only; no _SECONDS suffix on the symbol."
applyTo:
  - "**/*.env*"
  - "**/parseEnv*.ts"
  - "**/*Expiration*.ts"
  - "**/productMembership*.ts"
---

# Expiration naming

Follow [`env-expiration-naming`](.llm/exports/opencode/skills/env-expiration-naming/SKILL.md): env keys and exported constants that denote expiration durations end with `_EXPIRATION`; values are seconds — do not append `_SECONDS` to those names.
