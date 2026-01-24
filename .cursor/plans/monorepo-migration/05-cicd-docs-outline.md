# Phase 5: CI/CD & Documentation (Outline)

**Status**: Outline - detailed plan after Phase 4

## Overview

Set up GitHub Actions, update Jenkins, finalize docs.

## GitHub Actions

### CI Workflow (ci.yml)
- Lint, type-check, test on PRs

### Publish Alpha (publish-alpha.yml)
1. Validate job (lint, type-check, build all)
2. Publish packages (sequential)
3. Publish Docker images (parallel)

## Jenkins Updates

- Update git repo URL
- Update config paths (config/ → infra/config/)
- Update Docker paths

## Documentation

- Finalize README, ARCHITECTURE, CONTRIBUTING
- Complete `.llm/context/` docs
- Update LLM history

## Archive Original Repos

- Add deprecation notice
- Point to monorepo
- Archive on GitHub

## Estimated Effort

~12-16 hours total
