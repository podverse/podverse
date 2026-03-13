# test-assets-mkdir-on-startup

**Started:** 2026-02-19  
**Context:** Test assets server should create assets directory on startup if missing.

---

### Session 1 - 2026-02-19

#### Prompt (Developer)

In the test assets directory, assets folder should be created on startup of the server if assets
does not already exist.

#### Key Decisions

- Create `tools/test-assets/assets` on server startup using `fs.mkdirSync(this.assetsDir, {
recursive: true })` instead of throwing when the directory is missing.

#### Files Modified

- tools/test-assets/src/asset-server.ts
