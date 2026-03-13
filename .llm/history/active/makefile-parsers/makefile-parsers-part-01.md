### Session 1 - 2026-02-20

#### Prompt (Developer)

add makefile commands that start all parsers

#### Key Decisions

- **local_run_parsers_all**: build workers and create/run parser containers (existing behavior).
- **local_start_parsers_all**: assume containers already exist; start them with `docker start` (no create).

#### Files Modified

- Makefile.local.apps
