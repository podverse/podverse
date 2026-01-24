# Contributing

## Setup

```bash
git clone https://github.com/podverse/podverse.git
cd podverse && nvm use && npm install
npm run build:packages
```

## Run Apps

```bash
npm run dev:api
npm run dev:web
```

## Workflow

1. Branch: `git checkout -b feature/name`
2. Code and lint: `npm run lint`
3. Commit with issue: `Fix bug #123`
4. Open PR

## Testing

Testing strategy is evolving. Current state:

- **Unit tests**: Limited coverage, expanding
- **E2E tests**: Available in `apps/api/tests/` and `apps/web/qa/`
- **Test data**: Use `tools/qa` for generating test fixtures

```bash
# Run linting
npm run lint

# Run tests (when available)
npm run test
```

## Code Review Guidelines

### For Authors
- Keep PRs focused and reasonably sized
- Include issue reference in PR description
- Respond to feedback promptly
- Ensure CI passes before requesting review

### For Reviewers
- Review within 24-48 hours when possible
- Be constructive and specific
- Approve when satisfied, don't over-nitpick
- Test locally for significant changes

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

See `pipelines/` for pipeline definitions.

## LLM Development

- History auto-tracked in `.llm/history/`
- Provide issue links when possible
- Pre-commit hook enforces history updates for code changes

## Non-LLM Development

This project tracks LLM-assisted development in `.llm/history/`. The pre-commit hook checks for history updates when code changes are committed.

**If you're developing WITHOUT LLM assistance:**

```bash
SKIP_HISTORY_CHECK=1 git commit -m "your message"
```

This is the expected workflow for:
- Manual coding without AI assistance
- Quick fixes where LLM wasn't used
- External contributors not using Cursor/LLM tools

No history entry is needed for non-LLM work.
