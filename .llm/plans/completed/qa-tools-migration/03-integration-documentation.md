# Integration and Documentation Plan

**Status**: Complete  
**Parent**: [00-master-plan.md](./00-master-plan.md)  
**Complexity**: Low

## Overview

Create documentation and finalize the migration after both tools are migrated.

## Tasks

### 1. Create Overview README

Create `tools/web-perf/README.md`:

````markdown
# Web Performance Tools

Performance testing and analysis tools for Podverse web applications.

## Tools

### Bundle Analyzer

Analyzes Next.js bundle sizes and generates interactive visualizations.

**Location**: `bundle-analyzer/`

**Run**:

```bash
cd tools/web-perf/bundle-analyzer
npm install
npm run analyze
```
````

**Output**: HTML visualizations and JSON stats in `reports/bundle-analyzer/`

### Lighthouse

Automated Lighthouse performance testing with Playwright browser automation.

**Location**: `lighthouse/`

**Run**:

```bash
cd tools/web-perf/lighthouse
npm install
npm test
```

**Prerequisites**:

- Docker running
- `podverse-ops` repo available (for test database)

**Output**: JSON reports and comparison summaries in `reports/lighthouse/`

## Supported Applications

These tools can test:

- `apps/web` - Main Podverse web application
- `apps/management-web` - Admin dashboard (future)

## Reports Directory

Generated reports are stored in `reports/` subdirectories:

- `reports/bundle-analyzer/` - Bundle analysis reports
- `reports/lighthouse/` - Lighthouse performance reports

Reports are gitignored and generated on demand.

```

### 2. Create Reports Directory Structure

```

tools/web-perf/
reports/
bundle-analyzer/.gitkeep
lighthouse/.gitkeep
.gitignore

```

**reports/.gitignore**:
```

# Ignore generated reports

_.html
_.json
\*.md
!.gitkeep
!.gitignore

````

### 3. Update Tool READMEs

Update `tools/web-perf/bundle-analyzer/README.md` with:
- Monorepo-specific instructions
- Path to `apps/web` for testing
- Reports location

Update `tools/web-perf/lighthouse/README.md` with:
- Monorepo-specific instructions
- Dependencies on `apps/web`, `apps/api`, `podverse-ops`
- Port usage table
- Troubleshooting section

### 4. Add .gitignore Entries

Update root `.gitignore` or create `tools/web-perf/.gitignore`:

```gitignore
# Generated reports
reports/bundle-analyzer/*.html
reports/bundle-analyzer/*.json
reports/bundle-analyzer/*.md
reports/lighthouse/*.json
reports/lighthouse/*.md

# Generated assets (lighthouse)
lighthouse/assets/*.jpg
lighthouse/assets/*.mp3
lighthouse/assets/*.mp4

# Dependencies
bundle-analyzer/node_modules/
lighthouse/node_modules/
````

### 5. Update Monorepo Documentation (Optional)

Consider adding a section to the main `README.md` about performance testing:

```markdown
## Performance Testing

Performance testing tools are available in `tools/web-perf/`:

- **Bundle Analyzer**: Analyze Next.js bundle sizes
- **Lighthouse**: Automated performance testing

See [tools/web-perf/README.md](tools/web-perf/README.md) for details.
```

## Verification Steps

### Final Testing

1. **Bundle Analyzer**:

   ```bash
   cd tools/web-perf/bundle-analyzer
   npm install
   npm run analyze
   # Verify HTML reports generated
   ```

2. **Lighthouse**:

   ```bash
   cd tools/web-perf/lighthouse
   npm install
   # Ensure Docker is running
   npm test
   # Verify JSON reports generated
   ```

3. **Documentation Review**:
   - All paths correct in READMEs
   - Prerequisites clearly stated
   - Port usage documented

### Cleanup Original Files

After verification, the original files in `podverse-web/qa/` can be:

1. Marked as deprecated in the old repo
2. Deleted (if podverse-web is being archived)
3. Left as-is with a note pointing to monorepo

**Recommendation**: Add a note to `podverse-web/qa/README.md`:

```markdown
> **Note**: These tools have been migrated to the podverse monorepo at `tools/web-perf/`.
> This directory is deprecated and will be removed in a future cleanup.
```

## Success Criteria

- [ ] `tools/web-perf/README.md` created with clear instructions
- [ ] Reports directories created with .gitkeep files
- [ ] .gitignore properly ignores generated files
- [ ] Both tools run successfully from new location
- [ ] Documentation accurate and helpful
- [ ] (Optional) Main README updated with performance testing section
