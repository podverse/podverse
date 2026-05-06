# pgAdmin local port 3050

**Started:** 2026-05-05
**Author:** LLM
**Context:** Map local pgAdmin to host port 3050 instead of 5051.

## Session 1 - 2026-05-05

#### Prompt (Developer)

instead of using port 5051 for pgadmin in podverse use 3050

#### Key Decisions

- Change Docker host port mapping `127.0.0.1:5051:80` → `127.0.0.1:3050:80` in `infra/docker/local/pgadmin/docker-compose.yml`.
- Update `README.md` and `docs/QUICKSTART.md` so documented URL is `http://localhost:3050`.

#### Files Created/Modified

- `infra/docker/local/pgadmin/docker-compose.yml`
- `README.md`
- `docs/QUICKSTART.md`
- `.llm/history/active/pgadmin-local-port-3050/pgadmin-local-port-3050-part-01.md`
