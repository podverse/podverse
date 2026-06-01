# GitHub Scripts

Helper scripts for GitHub repository setup and maintenance.

## Scripts

### `setup-all-labels.sh` ⭐ Primary Script

**Creates the complete 23-label system** for the Podverse repository.

**When to run:**

- **Initial setup**: When setting up a new repository or fork
- **After accidental deletion**: To restore the label system
- **Label updates**: When colors or descriptions need updating
- **Migration**: After removing old labels

**Usage:**

```bash
# Authenticate with GitHub CLI (one-time)
gh auth login

# Run the comprehensive setup script
./scripts/github/setup-all-labels.sh
```

**What it creates (23 labels):**

| Category            | Count | Labels                                                          |
| ------------------- | ----- | --------------------------------------------------------------- |
| **GitHub Defaults** | 6     | bug, duplicate, enhancement, invalid, question, wontfix         |
| **Custom Type**     | 1     | technical-improvement                                           |
| **Code Areas**      | 8     | apps, packages, docs, infra, ci, scripts, tools, i18n           |
| **Workflow**        | 1     | blocked                                                         |
| **Security**        | 1     | security                                                        |
| **Dependencies**    | 2     | dependencies, docker                                            |
| **Priority**        | 4     | priority:critical, priority:high, priority:medium, priority:low |

The script is **idempotent** and **comprehensive**:

- ✅ Creates missing labels
- 🔄 Updates labels if colors/descriptions changed
- ⏭️ Skips labels that are already correct
- ❌ Reports any errors

**Output example:**

```
🏷️  GitHub Labels - Complete Setup
====================================

Repository: podverse/podverse

Creating labels (21 total)...

  ✓ bug (already correct)
  ✅ dependencies (created)
  🔄 priority:high (updated color/description)
  ...

====================================
Summary:
  Already correct: 16
  Created: 3
  Updated: 2

✅ Setup complete!
```

After create/update, if the repo has labels not defined in the script, the script lists them and optionally prompts to delete them (interactive TTY only). Deleting does not remove labels from existing issues/PRs; it only retires them for new use.

## Complete Label System

The repository uses **23 carefully selected labels**:

### Design Principles

1. **Minimal but complete** - Only labels that serve a clear purpose
2. **Automation-friendly** - Used by pr-labeler and vulnerability-scanner workflows
3. **Distinct colors** - No visual ambiguity, all 21 colors are unique
4. **Best practices** - Follows open source conventions while meeting project needs

### Color Palette

- **Red family**: Critical issues (bug, security, priority:critical)
- **Orange**: High priority, infrastructure
- **Yellow**: CI, documentation
- **Green**: Enhancements, apps
- **Blue**: Dependencies, packages, i18n
- **Purple**: Questions, medium priority, blocked, scripts
- **Teal**: Low priority
- **Gray**: Status labels (duplicate, invalid, wontfix)

See [docs/repo-management/GITHUB-LABELS.md](/docs/repo-management/GITHUB-LABELS.md) for complete color specifications.

## Requirements

- **GitHub CLI** (`gh`): [Installation instructions](https://github.com/cli/cli#installation)
- **Authentication**: Run `gh auth login` once to authenticate

## Workflows Using Labels

### `pr-labeler.yml`

Automatically labels PRs based on changed files using existing labels:

- Changes to `apps/` → `apps` label
- Changes to `packages/` → `packages` label
- Changes to `.github/` → `ci` label
- etc.

### `vulnerability-scanner.yml`

Labels security issues by severity:

- All issues: `security`, `dependencies`
- By severity: `priority:critical`, `priority:high`, `priority:medium`, `priority:low`

## Adding New Labels

1. Add the label definition to `setup-all-labels.sh`:

   ```bash
   LABELS=(
     ...
     "new-label|hexcolor|Description"
   )
   ```

2. Ensure the color is unique:

   ```bash
   gh label list --json name,color
   ```

3. Run the script to create it:

   ```bash
   ./scripts/github/setup-all-labels.sh
   ```

4. Update `docs/repo-management/GITHUB-LABELS.md` with the new label

## Troubleshooting

### "gh: command not found"

Install GitHub CLI: https://github.com/cli/cli#installation

### "Not authenticated with GitHub"

Run `gh auth login` and follow the prompts

### "Failed to create label"

Usually means the label already exists. Check:

```bash
gh label list
```

### Want to recreate labels with new colors?

Edit the label in `setup-all-labels.sh`, then run the script again. To remove labels not in the script, run interactively and answer yes when prompted to delete extra labels.

## See Also

- [docs/repo-management/GITHUB-LABELS.md](/docs/repo-management/GITHUB-LABELS.md) - Complete label reference
