# Contributing

## Setup

See [QUICKSTART.md](QUICKSTART.md) for complete setup instructions including:

- Prerequisites (Docker, Node.js 22 LTS)
- Infrastructure services (database, message queue, cache)
- Building packages and running apps

### Quick Reference

```bash
npm run lint    # Run linting
npm run build   # Build all
npm run dev:api # Start API (localhost:1234)
npm run dev:web # Start web app (localhost:3000)
```

## Workflow

### Starting a Feature

Use the feature script to create a properly named branch with LLM history file:

```bash
npm run start-feature
```

This interactive script:

- Prompts for feature type (feature, fix, chore, docs, hotfix, release)
- Creates a branch with proper naming convention (e.g., `feature/add-podcast-chapters`)
- Creates an LLM history file in `.llm/history/active/`
- Links to GitHub issues (optional)

### During Development

1. Code and lint: `npm run lint`
2. Commit with issue reference: `Fix bug #123`
3. Keep LLM history updated if using AI assistance

### Completing a Feature

When ready to submit a PR, simply push your branch and open a PR.

> **Note**: LLM history files are automatically moved from `active/` to `completed/` when the PR is merged. You don't need to run any completion commands.

### Shell script formatting (optional)

We keep `prettier-plugin-sh` installed for formatting `.sh` scripts, but it is **not** part of `npm run lint` or CI. When used over the full repo, the plugin’s Go/WASM runtime can emit `panic: reflect: unimplemented: AssignableTo with interface` to stderr (the run still completes successfully). To avoid that in standard validation, the plugin is excluded from the default Prettier config.

To format shell scripts on demand, run:

```bash
npm run format:shell
```

This runs Prettier with the plugin only on `**/*.sh`. Use it at your discretion when you want to tidy shell scripts.

## Code Review Guidelines

### For Authors

- Keep PRs focused and reasonably sized
- Include issue reference in PR description
- Respond to feedback promptly
- Wait for a maintainer to run CI before requesting approval

### For Reviewers

- Review within 24-48 hours when possible
- Be constructive and specific
- Approve when satisfied, don't over-nitpick
- Test locally for significant changes
- Comment `/test` to trigger CI on external PRs

### CI for External Contributors

To prevent abuse of GitHub Actions, CI does not run automatically on PRs from external contributors. A maintainer must comment `/test` on the PR to trigger the CI workflow.

**Exception**: Dependabot PRs run CI automatically since Dependabot is a trusted GitHub bot.

The CI workflow runs:

- Database migration verification
- Linting
- Type checking
- Package builds
- App builds

## PR Checklist

Before submitting a PR:

- [ ] Code compiles without errors (`npm run build`)
- [ ] Linting passes (`npm run lint`)
- [ ] Changes are tested manually
- [ ] Commit messages reference issues
- [ ] PR description explains the change
- [ ] Documentation updated if needed

## Release/Deployment Process

### Packages

1. Update version in `package.json`
2. Build package: `npm run build -w packages/<name>`
3. Publish via Jenkins pipeline

### Applications

1. Merge to main branch
2. Jenkins pipeline builds and deploys
3. Deployment targets configured per environment

See `infra/pipelines/` for pipeline definitions.

## LLM Development (Optional)

If using AI assistants (Cursor, Claude, etc.), we encourage tracking your development history:

1. **Start with the script**: `npm run start-feature` creates both the branch and history file
2. **Keep history updated**: Record prompts and key decisions in `.llm/history/active/`
3. **Submit your PR**: History is automatically moved to `completed/` when merged

### 10-Session Limit

History files are limited to **10 sessions maximum** to prevent context overload. When a file reaches 10 sessions:

1. Rename `[feature].md` to `[feature]-part-01.md`
2. Create `[feature]-part-02.md` for sessions 11+
3. Continue numbering sessions sequentially (don't reset)

Example structure:

```
.llm/history/active/
  my-feature/                    # Each feature has its own directory
    my-feature.md                # Initial file (or after split:)
    my-feature-part-01.md        # Sessions 1-10
    my-feature-part-02.md        # Sessions 11-20, current
```

This helps maintain context for future LLM sessions and documents architectural decisions. However, it's not required - contributors can develop with or without LLM assistance and history tracking.
