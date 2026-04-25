---
name: github
description: "Converted from .llm/exports/github-copilot/skills/github/SKILL.md"
version: 1.0.0
---


# GitHub Workflows & Issue Management

## Repository Information

- **Repository**: `podverse/podverse`
- **Full URL**: https://github.com/podverse/podverse
- **Issues**: https://github.com/podverse/podverse/issues
- **Pull Requests**: https://github.com/podverse/podverse/pulls

This information is also available in `package.json`:

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/podverse/podverse.git"
  },
  "bugs": {
    "url": "https://github.com/podverse/podverse/issues"
  },
  "homepage": "https://github.com/podverse/podverse#readme"
}
```

## Accessing PRs and Issues

### Using GitHub CLI (when available)

```bash
# View a specific PR
gh pr view 35

# List open PRs
gh pr list

# View a specific issue
gh issue view 42

# List open issues
gh issue list
```

**Note**: The `gh` CLI requires network permissions. If certificate errors occur, the command may need `required_permissions: ['all']`.

### Direct URLs

When `gh` CLI is unavailable, construct URLs directly:

- **PR**: `https://github.com/podverse/podverse/pull/{number}`
- **Issue**: `https://github.com/podverse/podverse/issues/{number}`

### Web Search Fallback

If the user provides a GitHub URL or mentions a PR/issue number, you can:

1. Ask the user for the PR/issue title or description
2. Search for it in git history: `git log --all --oneline --grep="#35"`
3. Check the external links provided by the user in the conversation

## Common Dependabot PR Patterns

Dependabot creates PRs with predictable patterns:

### PR Title Format

```
chore(deps): bump {package} from {old-version} to {new-version}
```

Examples:

- `chore(deps): bump @types/node from 24.10.9 to 25.0.10`
- `chore(deps): bump openai from 5.23.2 to 6.16.0`
- `chore(deps): bump globals from 16.5.0 to 17.2.0`

### Labels

Dependabot PRs typically have labels like:

- `dependencies` - Changes to dependencies
- `apps Changes to apps/` - Affects apps workspace
- `packages Changes to packages/` - Affects packages workspace
- `tools Changes to tools/` - Affects tools workspace

### Finding Affected Files

When working on a Dependabot PR, search for the package in all `package.json` files:

```bash
# Find all instances of a package
grep -r "@types/node" --include="package.json"

# Or use the Grep tool
grep pattern="@types/node" glob="package.json"
```

## Workflow for Completing Dependency Updates

1. **Identify affected files**: Search for the package across all workspaces
2. **Update versions**: Change all instances to the target version
3. **Verify**: Run `npm install` to update lock files
4. **Test**: Run `npm run lint` and `npm run type-check`
5. **Commit**: Use conventional commit format

## Git History for PRs

Search for PR references in git history:

```bash
# Search for a specific PR number
git log --all --oneline --grep="#35"

# Search for recent dependency updates
git log --all --oneline --grep="chore(deps)"

# View current branch status
git branch -vv
```

## Related Documentation

- [GitHub Labels](../../../docs/GITHUB-LABELS.md) - Complete label documentation
- [Contributing Guide](../../../docs/CONTRIBUTING.md) - Contribution workflow
- [Global Skill](../global/SKILL.md) - General patterns and workflows
