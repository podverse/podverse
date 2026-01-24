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
