# test-assets-bind-mount

**Started:** 2026-02-23  
**Context:** Make test-assets container serve live assets via bind mount.

---

### Session 1 - 2026-02-23

#### Prompt (Developer)

i can restart the container, but is there a simple way to make it so the files can be available without requiring a restart after generate_and_parse?

do it

#### Key Decisions

- Bind-mount the host `tools/test-assets/assets` directory into the test-assets container.

#### Files Modified

- infra/docker/local/test-assets/docker-compose.yml
