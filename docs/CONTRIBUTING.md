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
