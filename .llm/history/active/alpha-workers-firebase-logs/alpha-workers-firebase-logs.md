# Alpha workers Firebase path and log directory permissions

**Started**: 2026-03-17  
**Context**: Fix alpha environment bugs: Firebase admin JSON not found (compose volume path
mismatch) and EACCES on /opt/logs (log dir ownership). Plan: alpha_workers_firebase_and_logs_debug.

---

### Session 1 - 2026-03-17

#### Prompt (Developer)

Implement the plan as specified... Do NOT edit the plan file itself. To-do's from the plan have
already been created. Do not create them again. Mark them as in_progress as you work, starting
with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Required fix: alpha workers docker-compose template Firebase volume host path updated from
  `../../../config/google/firebase/...` to `../../../config/alpha/google/firebase/...` to match
  where Ansible deploys the file.
- Optional Ansible: added task to ensure `/opt/podverse/logs` exists (mode 0755) before
  creating `logs/workers` so the parent dir exists with suitable permissions.
- Optional Firebase resilience: added `existsSync()` check before `require(adminJsonPath)` in
  external-services-firebase factory so missing file is handled without throwing
  MODULE_NOT_FOUND; existing try/catch retained for other require errors. Import order: Node
  built-ins (fs, module), then firebase-admin, then relative type import.

#### Files Created/Modified

- `podverse/infra/docker/alpha/workers/docker-compose.yml.template` (Firebase volume host path)
- `podverse-ansible/roles/podverse_alpha_workers_conf/tasks/main.yml` (ensure /opt/podverse/logs)
- `podverse/packages/external-services-firebase/src/factory.ts` (existsSync + import order)
