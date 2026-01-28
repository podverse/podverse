# Web Performance Tools

Performance testing and analysis tools for Podverse web applications.

## Directory Structure

```
tools/web-perf/
  bundle-analyzer/     # Bundle size analysis tool
  lighthouse/          # Lighthouse performance testing
  reports/             # Generated performance reports
    bundle-analyzer/   # Bundle analysis reports
    lighthouse/        # Lighthouse test reports
```

## Tools

### Bundle Analyzer

Analyzes Next.js bundle sizes and generates interactive visualizations.

**Location**: `bundle-analyzer/`

**Key Features:**

- Automated Next.js production build analysis
- Interactive HTML reports for server and client bundles
- Report comparison with OpenAI-powered insights
- Historical report tracking

**Run**:

```bash
cd tools/web-perf/bundle-analyzer
npm install
npm run analyze
```

**Output**: HTML visualizations and JSON stats in `reports/bundle-analyzer/`

See `bundle-analyzer/TOOLS-WEB-PERF-BUNDLE-ANALYZER.md` for detailed documentation.

### Lighthouse

Automated Lighthouse performance testing with Playwright browser automation.

**Location**: `lighthouse/`

**Key Features:**

- Automated test environment setup (database, API, web app, asset server)
- Browser automation with Playwright
- Lighthouse performance testing for multiple scenarios
- Report comparison with OpenAI-powered insights
- Test fixture management

**Run**:

```bash
cd tools/web-perf/lighthouse
npm install
npm test
```

**Prerequisites**:

- Docker running
- `podverse-ops` repo available as a sibling to the monorepo (for test database)
- Chrome/Chromium browser

**Output**: JSON reports and comparison summaries in `reports/lighthouse/`

See `lighthouse/TOOLS-WEB-PERF-LIGHTHOUSE.md` for detailed documentation.

## Supported Applications

These tools can test:

- `apps/web` - Main Podverse web application
- `apps/management-web` - Admin dashboard (future)

## Reports Directory

Generated reports are stored in `reports/` subdirectories:

- `reports/bundle-analyzer/` - Bundle analysis reports
- `reports/lighthouse/` - Lighthouse performance reports

Reports are gitignored and generated on demand.

## Architecture

Both tools are standalone and do not require running services during setup. They operate on the codebase directly:

- **Bundle Analyzer**: Builds the Next.js app with `@next/bundle-analyzer` enabled and generates HTML visualizations
- **Lighthouse**: Orchestrates a complete test environment (database, API, web app) and runs automated Playwright + Lighthouse tests

## Getting Started

1. Choose a tool based on your needs:
   - **Bundle size optimization**: Use Bundle Analyzer
   - **Performance metrics (LCP, FID, CLS)**: Use Lighthouse

2. Follow the tool-specific README for detailed instructions

3. Review generated reports in the `reports/` directory

## Notes

- Reports include timestamps and can be compared between runs
- Both tools support OpenAI-powered summary generation (requires API key in `.env.openai`)
- Tools are independent and can be run separately
