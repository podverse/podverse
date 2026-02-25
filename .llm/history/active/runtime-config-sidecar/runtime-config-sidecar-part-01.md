### Session 1 - 2026-02-24

#### Prompt (Developer)

# Root Cause

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- TBD

### Session 2 - 2026-02-25

#### Prompt (Developer)

Runtime Config Validation Update

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as
in_progress as you work, starting with the first one. Don't stop until you have completed all
the to-dos.

#### Key Decisions

- Force web sidecar dev script to rebuild so dist matches LNAddress/Node keys.
- Log per-category validation output through stdout to keep ordering stable.

#### Files Modified

- package.json
- packages/helpers-config/src/startupValidation.ts

### Session 3 - 2026-02-25

#### Prompt (Developer)

Donate Page "Not Configured" Despite LNAddress Set — Implement the plan as specified.

#### Key Decisions

- Layout fetches from sidecar when !hasRuntimeConfig() and RUNTIME_CONFIG_URL set so first paint has correct config.
- Optional lightning app_value env values normalized: empty string treated as undefined in buildConfig.

#### Files Modified

- apps/web/src/app/layout.tsx
- apps/web/src/config/index.ts
