---
name: podverse-github-workflows
description: GitHub workflows for podverse/podverse — gh policy, issue and PR lookup, and Dependabot updates. Use when asked to create or update a GitHub issue, or when working with gh, issues, or pull requests.
version: 1.0.0
---

# GitHub Workflows & Issue Management

## Agent policy: `gh` is a git operation

For agents, **`gh` counts as git** — same operator-only policy as `git`. Read-only `gh` is fine (`gh pr view`, `gh issue list`, `gh run list`). Do **not** run write `gh` commands (`gh pr create`, `gh pr merge`, `gh release create`, mutating `gh api`, etc.) unless the user explicitly requests that exact command in that message.

After implementation, give the operator fenced `bash` commands (`git` and `gh`) for commit, push, PR, and merge. See **operator-only-git-operations** rule.

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

## Creating and updating issues

When the operator asks for a GitHub issue, new or edited, use the shape of
[#398](https://github.com/podverse/podverse/issues/398). That is the usual level of detail.

Read the code before writing. A claim that something already exists, or that a flow gets a
case wrong, has to come from that reading.

### Title

Name the behavior the issue is responsible for. Include every part a reader would otherwise
treat as out of scope. A mechanism (a button, an export, a screen) is the wrong title when the
work also decides ordering, what is kept, or what is cleared.

Prefix with the surface when sibling issues do (`Mobile:`, `Web:`).

If the body covers more than the title, retitle before finishing.

### Body

Two sections, plus a third when the request touched behavior that is already done:

**Summary.** One short paragraph. The outcome.

**What to add.** The work, as points an implementer can finish without guessing the cases that
change the result:

- Where it shows up, including every path that shares the screen or action
- What the person sees, and what each action does (confirm, cancel, skip, failure)
- Ordering that changes the result, such as what must happen before a session ends, and which
  server a request uses
- What the change includes, and what it leaves out
- The test that has to cover the new behavior

**Already in place.** Behavior you checked that this issue must leave as it is. One or two
sentences each. Record a non-change when the operator's request included it and the code
already does it. Leave out behavior the request never touched.

Skip the feature-request template's empty sections. Skip a file-by-file implementation plan.
Skip restating an inventory the product already shows, except to say that inventory stays.

## Planning from an issue

A pasted issue that should be planned follows **abcissue**. This skill does not plan or implement
it, and it does not post the reply.

## Related Documentation

- [GitHub Labels](/docs/repo-management/GITHUB-LABELS.md) - Complete label documentation
- [Contributing Guide](/docs/development/CONTRIBUTING.md) - Contribution workflow
- [Global Skill](/.cursor/skills/global/SKILL.md) - General patterns and workflows
