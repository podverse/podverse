### Session 1 - 2026-02-23

#### Prompt (Developer)

create the script in scripts/v4v/btc/ln/lnd-http-proxy.js

#### Key Decisions

- Wrote a plain HTTP proxy (Node.js built-ins only, CommonJS) that forwards to LND HTTPS REST at https://localhost:18080.
- Injects admin macaroon header automatically; uses OS-aware Nigiri credential paths.
- Falls back to rejectUnauthorized: false when TLS cert is unavailable.

#### Files Modified

- scripts/v4v/btc/ln/lnd-http-proxy.js (created)

---

### Session 2 - 2026-02-23

#### Prompt (Agent)

LND HTTP Proxy Auto-start

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Containerized the proxy as a Docker service mirroring the LNURL server pattern.
- Placed source in infra/docker/local/lnd-http-proxy/ (canonical for Docker); scripts/ version kept for host-only use.
- Wired into local_ln_up / local_ln_down / local_ln_clean in Makefile.local.v4v.
- Port 8181 for the HTTP proxy.

#### Files Modified

- infra/docker/local/lnd-http-proxy/proxy.js (created)
- infra/docker/local/lnd-http-proxy/package.json (created)
- infra/docker/local/lnd-http-proxy/Dockerfile (created)
- infra/docker/local/lnd-http-proxy/docker-compose.yml (created)
- Makefile.local.v4v (modified)
- docs/infra/LOCAL-LIGHTNING.md (modified)
