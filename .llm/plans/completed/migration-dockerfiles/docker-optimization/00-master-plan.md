# Docker Optimization - Master Plan

## Overview

Optimize Docker builds to reduce image size and build times by:

1. Adding `.dockerignore` to exclude unnecessary files from build context
2. Converting single-stage Dockerfiles to multi-stage builds
3. Adding Makefile targets for building and testing Docker images
4. Updating documentation with Docker build instructions

## Status

- [x] Create `.dockerignore` (COMPLETED)
- [x] Convert Dockerfiles to multi-stage (COMPLETED)
- [x] Update LLM history (COMPLETED)
- [x] Add Makefile targets for Docker builds (COMPLETED)
- [x] Update documentation (COMPLETED)

## Sub-Plans

1. **[01-makefile-targets.md](01-makefile-targets.md)** - Add Makefile targets for building and testing Docker images
2. **[02-documentation-updates.md](02-documentation-updates.md)** - Update documentation files with Docker instructions

## Expected Benefits

| Metric             | Before                     | After            |
| ------------------ | -------------------------- | ---------------- |
| Build context size | ~1GB+                      | ~50MB            |
| Final image (api)  | ~800MB                     | ~300MB           |
| Build speed        | Slow (copies node_modules) | Fast             |
| Security           | Contains source code       | Only compiled JS |

## Completed Work

### Files Created/Modified

- `.dockerignore` - Excludes node_modules, docs, infra, etc.
- `apps/api/Dockerfile` - Multi-stage build
- `apps/workers/Dockerfile` - Multi-stage build
- `apps/management-api/Dockerfile` - Multi-stage build
- `Makefile.local` - Added Docker build and test targets
- `docs/QUICKSTART.md` - Added Docker Images section
- `README.md` - Added Docker section
- `apps/api/README.md` - Added Docker section
- `apps/workers/README.md` - Added Docker section
- `.llm/history/active/migration-dockerfiles/migration-dockerfiles.md` - Updated with session details
