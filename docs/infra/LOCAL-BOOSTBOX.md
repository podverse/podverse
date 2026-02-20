# Boostbox in Local Infrastructure

Boostbox (V4V boost metadata API) is integrated into the Podverse local Docker setup so that
`make local_infra_up` starts it with the rest of the stack. Boostbox is a **special case**: its
source lives in a **separate repository**, not inside the Podverse monorepo.

## Why a separate repo?

Boostbox is developed as its own project (e.g. [podverse/boostbox](https://github.com/podverse/boostbox)
or [noblepayne/boostbox](https://github.com/noblepayne/boostbox)). It is cloned as a **sibling** of the
Podverse repo so the Makefile can build its Docker image and start it as part of local infra.

## Expected layout

The Makefile and local scripts **assume the Boostbox repo is a sibling of the Podverse monorepo**. Clone Boostbox next to Podverse, for example:

```
repos/
  podverse/     # this monorepo
  boostbox/     # sibling repo
```

From the Podverse repo root, the path to Boostbox must be `../boostbox` (not configurable).

## First-time setup

1. Clone the Boostbox repo as a sibling of Podverse (e.g. `../boostbox` from the monorepo root).
2. Ensure the Boostbox repo has a `Dockerfile` (see the boostbox repo; it should build the app and
   expose port 8080).
3. From the Podverse repo root, build the image once:

   ```bash
   make local_build_boostbox
   ```

4. After that, `make local_infra_up` will start Boostbox with db, mq, keyvaldb, and management-db.

## Running and stopping

- **Start (with rest of infra):** `make local_infra_up` — Boostbox is available at `http://localhost:8080`.
- **Start Boostbox only:** `make local_boostbox_up` (image must already exist; run `make local_build_boostbox` first if needed).
- **Stop (with rest of infra):** `make local_all_down`.
- **Stop Boostbox only:** `make local_boostbox_down`.

## Config

- Env file: `infra/config/local/boostbox.env` (created from `infra/config/env-templates/boostbox.env.example` if missing).
- Defaults (filesystem storage, dev) are fine for local V4V testing.

## Using a pre-built image

If you do not have a local Boostbox clone, you can use the upstream image instead of building:

1. In `infra/docker/local/boostbox/docker-compose.yml`, change `image: boostbox:latest` to
   `image: ghcr.io/noblepayne/boostbox:latest` (or your registry).
2. Skip `make local_build_boostbox`; `make local_boostbox_up` and `make local_infra_up` will pull
   the image.
