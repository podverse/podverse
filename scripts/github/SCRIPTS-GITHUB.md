# GitHub Scripts

Helper scripts for GitHub repository setup and maintenance.

## Scripts

### `setup-all-labels.sh` ⭐ Primary Script

**Creates the complete 21-label system** for the Podverse repository.

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

**What it creates (21 labels):**

| Category            | Count | Labels                                                          |
| ------------------- | ----- | --------------------------------------------------------------- |
| **GitHub Defaults** | 6     | bug, duplicate, enhancement, invalid, question, wontfix         |
| **Code Areas**      | 8     | apps, packages, docs, infra, ci, scripts, tools, i18n           |
| **Workflow**        | 1     | blocked                                                         |
| **Security**        | 1     | security                                                        |
| **Dependencies**    | 1     | dependencies                                                    |
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

### `remove-old-labels.sh`

**Removes obsolete labels** that are no longer needed.

**When to run:**

- **One-time migration**: When trimming down to the 21-label system
- **After label standardization**: To clean up old labels

**⚠️ WARNING**: This permanently deletes labels. Issues with these labels will keep them, but they won't be available for new issues.

**Usage:**

```bash
gh auth login
./scripts/github/remove-old-labels.sh
```

**What it removes (13 labels):**

- `good first issue`, `help wanted`
- `documentation`, `accessibility`, `translations`, `task`
- `more info needed`, `needs reproduction`, `needs verification`, `ready to deploy`
- `bounty`, `bounty pending`, `bounty completed`

The script will prompt for confirmation before deleting anything.

## Complete Label System

The repository uses **21 carefully selected labels**:

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

See [docs/GITHUB-LABELS.md](../../docs/GITHUB-LABELS.md) for complete color specifications.

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

4. Update `docs/GITHUB-LABELS.md` with the new label

### Deprecated: setup-labels.sh

The old `setup-labels.sh` script only created 5 labels (dependencies + priorities). It has been replaced by `setup-all-labels.sh` which creates the complete 21-label system. The old script is kept for backward compatibility but should not be used for new setups.

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

Delete and recreate:

```bash
gh label delete "label-name"
./scripts/github/setup-labels.sh
```

## See Also

- [docs/GITHUB-LABELS.md](../../docs/GITHUB-LABELS.md) - Complete label reference
- [docs/VULNERABILITY-SCANNER.md](../../docs/VULNERABILITY-SCANNER.md) - Vulnerability scanner documentation
