# GitHub Labels Reference

This document lists all 21 labels in the Podverse repository for consistent issue and PR management.

**Labels can be programmatically recreated** using `./scripts/github/setup-all-labels.sh`

## Category: Security & Priority

| Label               | Color                                                                  | Description                           | Origin                         |
| ------------------- | ---------------------------------------------------------------------- | ------------------------------------- | ------------------------------ |
| `security`          | ![#550000](https://via.placeholder.com/15/550000/550000.png) `#550000` | Security vulnerabilities              | Custom                         |
| `priority:critical` | ![#e11d21](https://via.placeholder.com/15/e11d21/e11d21.png) `#e11d21` | Critical priority - maximum urgency   | Custom (vulnerability scanner) |
| `priority:high`     | ![#eb6420](https://via.placeholder.com/15/eb6420/eb6420.png) `#eb6420` | High priority - important issues      | Custom (vulnerability scanner) |
| `priority:medium`   | ![#d4c5f9](https://via.placeholder.com/15/d4c5f9/d4c5f9.png) `#d4c5f9` | Medium priority - moderate importance | Custom (vulnerability scanner) |
| `priority:low`      | ![#1f8b84](https://via.placeholder.com/15/1f8b84/1f8b84.png) `#1f8b84` | Low priority - low urgency            | Custom (vulnerability scanner) |

## Category: Type (GitHub Defaults)

| Label         | Color                                                                  | Description                                 | Origin         |
| ------------- | ---------------------------------------------------------------------- | ------------------------------------------- | -------------- |
| `bug`         | ![#990000](https://via.placeholder.com/15/990000/990000.png) `#990000` | Something isn't working                     | GitHub default |
| `enhancement` | ![#00FF99](https://via.placeholder.com/15/00FF99/00FF99.png) `#00FF99` | New feature or request                      | GitHub default |
| `question`    | ![#9900FF](https://via.placeholder.com/15/9900FF/9900FF.png) `#9900FF` | A question for the maintainers or community | GitHub default |
| `duplicate`   | ![#888888](https://via.placeholder.com/15/888888/888888.png) `#888888` | This issue or pull request already exists   | GitHub default |
| `invalid`     | ![#999999](https://via.placeholder.com/15/999999/999999.png) `#999999` | This issue is invalid                       | GitHub default |
| `wontfix`     | ![#999999](https://via.placeholder.com/15/999999/999999.png) `#999999` | This will not be worked on                  | GitHub default |

## Category: Dependencies

| Label          | Color                                                                  | Description                            | Origin                                     |
| -------------- | ---------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------ |
| `dependencies` | ![#0366d6](https://via.placeholder.com/15/0366d6/0366d6.png) `#0366d6` | Dependency updates and security issues | Custom (vulnerability scanner, dependabot) |

## Category: Workflow

| Label     | Color                                                                  | Description                                        | Origin |
| --------- | ---------------------------------------------------------------------- | -------------------------------------------------- | ------ |
| `blocked` | ![#990099](https://via.placeholder.com/15/990099/990099.png) `#990099` | The work on this issue is blocked by another issue | Custom |

## Category: Code Area (Monorepo Structure)

| Label      | Color                                                                  | Description                           | Origin              |
| ---------- | ---------------------------------------------------------------------- | ------------------------------------- | ------------------- |
| `apps`     | ![#0e8a16](https://via.placeholder.com/15/0e8a16/0e8a16.png) `#0e8a16` | Changes to apps/                      | Custom (pr-labeler) |
| `packages` | ![#1d76db](https://via.placeholder.com/15/1d76db/1d76db.png) `#1d76db` | Changes to packages/                  | Custom (pr-labeler) |
| `docs`     | ![#fef2c0](https://via.placeholder.com/15/fef2c0/fef2c0.png) `#fef2c0` | Changes to docs/                      | Custom (pr-labeler) |
| `infra`    | ![#d93f0b](https://via.placeholder.com/15/d93f0b/d93f0b.png) `#d93f0b` | Changes to infra/                     | Custom (pr-labeler) |
| `ci`       | ![#fbca04](https://via.placeholder.com/15/fbca04/fbca04.png) `#fbca04` | Changes to .github/                   | Custom (pr-labeler) |
| `scripts`  | ![#5319e7](https://via.placeholder.com/15/5319e7/5319e7.png) `#5319e7` | Changes to scripts/                   | Custom (pr-labeler) |
| `tools`    | ![#e99695](https://via.placeholder.com/15/e99695/e99695.png) `#e99695` | Changes to tools/                     | Custom (pr-labeler) |
| `i18n`     | ![#c5def5](https://via.placeholder.com/15/c5def5/c5def5.png) `#c5def5` | Changes to internationalization files | Custom (pr-labeler) |

## Label Usage by Workflow

### Vulnerability Scanner (`vulnerability-scanner.yml`)

- `security` - Applied to all vulnerability issues
- `dependencies` - Applied to all dependency-related vulnerabilities
- `priority:critical`, `priority:high`, `priority:medium`, `priority:low` - Applied by severity

### PR Labeler (`pr-labeler.yml`)

- `apps`, `packages`, `docs`, `infra`, `ci`, `scripts`, `tools`, `i18n` - Auto-applied based on changed files

### Manual Use

- `bug`, `enhancement`, `question`, `duplicate`, `invalid`, `wontfix` - Applied by maintainers
- `blocked` - Applied when work is blocked by another issue

## Label Conventions

### Color Scheme

**Priority Colors** (intentional progression):

- **Critical** `#e11d21` - Bright red, maximum urgency
- **High** `#eb6420` - Orange, high importance
- **Medium** `#d4c5f9` - Light purple, moderate importance
- **Low** `#1f8b84` - Teal, low urgency

**Color Families**:

- **Red** (`#990000`, `#550000`, `#e11d21`): Bugs, security, critical issues
- **Orange** (`#eb6420`, `#d93f0b`): High priority, infrastructure
- **Yellow** (`#fbca04`, `#fef2c0`): CI, documentation
- **Green** (`#0e8a16`, `#00FF99`): Apps, enhancements
- **Blue** (`#1d76db`, `#0366d6`, `#c5def5`): Packages, dependencies, i18n
- **Purple** (`#9900FF`, `#d4c5f9`, `#990099`, `#5319e7`): Questions, medium priority, blocked, scripts
- **Teal** (`#1f8b84`): Low priority
- **Pink** (`#e99695`): Tools
- **Gray** (`#888888`, `#999999`): Duplicates, invalid, wontfix

**Design Principles**:

- 21 distinct colors, no duplicates
- Context-appropriate color selection
- Clear visual hierarchy for priorities
- Good contrast for accessibility

### Naming Conventions

- **Lowercase** with spaces for multi-word labels
- **Colon notation** for hierarchical labels (e.g., `priority:high`)
- **Descriptive** names that clearly indicate purpose

## One-Time Setup

Before workflows can use labels, run the setup script once:

```bash
# Authenticate with GitHub CLI (if not already)
gh auth login

# Run the setup script
./scripts/github/setup-labels.sh
```

This script creates missing labels required by workflows:

- **Vulnerability Scanner** (`vulnerability-scanner.yml`): dependencies, priority:critical, priority:high, priority:medium, priority:low

Note: PR Labeler uses existing labels (apps, packages, docs, infra, ci, scripts, tools, i18n) which already exist in the repository.

The script is idempotent - safe to run multiple times.

## Creating New Labels

When creating new labels, follow these guidelines:

1. **Check existing labels** - Avoid duplicates
2. **Use consistent colors** - Follow the color scheme above
3. **Add descriptions** - Help others understand the label's purpose
4. **Group logically** - Use colon notation for related labels (e.g., `priority:*`)

### Recreating All Labels

To completely recreate the label system (e.g., in a new fork or after accidental deletion):

```bash
# 1. Authenticate
gh auth login

# 2. Remove old labels (if needed)
./scripts/github/remove-old-labels.sh

# 3. Create all 21 labels
./scripts/github/setup-all-labels.sh
```

The setup script is the source of truth for the label system.

## Quick Filters

### View all security issues

```
is:issue is:open label:security
```

### View critical priority items

```
is:issue is:open label:priority:critical
```

### View dependency updates

```
is:issue is:open label:dependencies
```

### View bounty issues

```
is:issue is:open label:bounty
```

### View good first issues for new contributors

```
is:issue is:open label:"good first issue"
```

## Label System Design

### Total: 21 Labels

| Category            | Count | Purpose                    |
| ------------------- | ----- | -------------------------- |
| GitHub Defaults     | 6     | Standard issue types       |
| Code Areas          | 8     | Monorepo structure mapping |
| Workflow            | 1     | Work blocking              |
| Security & Priority | 5     | Vulnerability tracking     |
| Dependencies        | 1     | Dependency management      |

### Why These Labels?

**Kept from Defaults:**

- Essential issue types (bug, enhancement, question)
- Status labels (duplicate, invalid, wontfix)

**Removed from Defaults:**

- `good first issue` - Not actively maintained
- `help wanted` - Not actively used

**Custom Labels:**

- **Code areas**: Match monorepo structure for automatic PR labeling
- **Priority system**: Required for vulnerability scanner
- **Dependencies**: Centralize dependency-related issues
- **Blocked**: Critical workflow indicator

### Label Philosophy

- **Minimal but complete**: Only labels that serve a clear purpose
- **Automation-friendly**: Used by pr-labeler and vulnerability-scanner
- **Distinct colors**: No visual ambiguity
- **Descriptive**: Clear purpose from name alone

## Maintenance

This document should be updated whenever:

- Labels are added/removed from `setup-all-labels.sh`
- Colors or descriptions change
- Workflow label usage changes

**Source of truth**: `scripts/github/setup-all-labels.sh`

Last updated: 2026-01-28
