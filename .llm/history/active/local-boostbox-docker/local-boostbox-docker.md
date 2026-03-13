# local-boostbox-docker

**Started:** 2026-02-19  
**Context:** Integrate Boostbox into local infra via Docker and Makefile; Boostbox repo is sibling to
Podverse.

---

### Session 1 - 2026-02-19

#### Prompt (Agent)

Boostbox Docker build and local infrastructure integration. Implement the plan as specified.

#### Key Decisions

- Added Dockerfile to boostbox repo (Clojure CLI, single-stage, port 8080, ENV/BB\_\* defaults).
- Podverse: boostbox docker-compose and env template; Makefile.local targets and integration;
  docs/infra/LOCAL-BOOSTBOX.md and V4V doc update.
- BOOSTBOX_REPO_PATH defaults to ../boostbox; local_boostbox_up does not auto-build (document
  first-time `make local_build_boostbox`).

#### Files Modified

- boostbox/Dockerfile (new)
- podverse/infra/docker/local/boostbox/docker-compose.yml (new)
- podverse/infra/config/env-templates/boostbox.env.example (new)
- podverse/Makefile.local (boostbox env rule, local_build_boostbox, local_boostbox_up/down,
  local_infra_up, local_all_down, local_clean)
- podverse/docs/infra/LOCAL-BOOSTBOX.md (new)
- podverse/docs/v4v/V4V-METABOOST-LNURL.md (prerequisites + link to LOCAL-BOOSTBOX)
