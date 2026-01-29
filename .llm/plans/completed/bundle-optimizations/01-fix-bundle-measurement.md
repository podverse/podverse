# Plan 01: Fix Bundle Measurement

## Goal

Use **client/server total asset size** (from analyzer stats JSON) as the primary "bundle size" in reports and comparisons, instead of the HTML report file size. This ensures we optimize and compare actual JS bundle size.

## Scope

- `tools/web-perf/bundle-analyzer/src/bundle-analyzer.ts`
- `tools/web-perf/bundle-analyzer/src/comparison.ts` (optional clarifications only; logic already uses `clientBundleSize` / `serverBundleSize` from report)
- `tools/web-perf/bundle-analyzer/src/index.ts` (logging uses report sizes; no code change if report values change)
- `BundleReport` in `report-manager.ts`: no type change; we still store `clientBundleSize` / `serverBundleSize`, but they will hold totalAssetSize when stats exist.

## Implementation

### 1. `bundle-analyzer.ts`

**Current behavior**: `clientBundleSize` and `serverBundleSize` are set to `Buffer.byteLength(html, 'utf8')` (HTML file size).

**New behavior**: Prefer `clientChunkSummary.totalAssetSize` / `serverChunkSummary.totalAssetSize` when available; otherwise fall back to HTML size (e.g. when only HTML is produced).

- After building `serverChunkSummary` from server stats:  
  `serverBundleSize = serverChunkSummary.totalAssetSize ?? (serverHtml ? Buffer.byteLength(serverHtml, 'utf8') : undefined)`
- After building `clientChunkSummary` from client stats:  
  `clientBundleSize = clientChunkSummary.totalAssetSize ?? (clientHtml ? Buffer.byteLength(clientHtml, 'utf8') : undefined)`

Ensure we only set `serverBundleSize` / `clientBundleSize` once we have either chunk summary or HTML, and that we don’t overwrite a totalAssetSize-based value with HTML size later.

**Concrete edits**:

1. Remove or repurpose the assignments that set `serverBundleSize` / `clientBundleSize` from `Buffer.byteLength(serverHtml/clientHtml, 'utf8')` immediately after saving HTML.
2. When saving server stats and building `serverChunkSummary`, set  
   `serverBundleSize = serverChunkSummary.totalAssetSize ?? (serverHtml ? Buffer.byteLength(serverHtml, 'utf8') : undefined)`  
   (and similarly if you later add a path where only HTML exists).
3. When saving client stats and building `clientChunkSummary`, set  
   `clientBundleSize = clientChunkSummary.totalAssetSize ?? (clientHtml ? Buffer.byteLength(clientHtml, 'utf8') : undefined)`.
4. If stats are missing but HTML exists, ensure we still set the corresponding bundle size from HTML so existing comparison and reporting logic keeps working.

### 2. `comparison.ts`

No functional change required: it already compares `baseReport.clientBundleSize` vs `newReport.clientBundleSize` (and server likewise). Once reports store totalAssetSize, comparisons automatically use it.

Optionally: add a short comment that "Client/Server Bundle Size" in comparison refers to client/server total asset size from stats when available.

### 3. `index.ts`

No code change. It logs `report.clientBundleSize` / `report.serverBundleSize`; these will now reflect total asset size when stats exist.

### 4. `report-manager.ts` / `BundleReport`

No type or field changes. `clientBundleSize` and `serverBundleSize` continue to be optional numbers; they now carry totalAssetSize when we have stats.

## Verification

1. Build and run analyzer:
   ```bash
   cd tools/web-perf/bundle-analyzer && npm install && npm run analyze
   ```
2. When prompted, use a report name like `post-measurement-fix`.
3. Open the generated JSON report: `reports/web/bundle-report-*-post-measurement-fix-*.json`.
4. Confirm `clientBundleSize` and `serverBundleSize` are present and that they match the **total size of JS/assets** (e.g. sum of client chunk sizes) rather than the HTML file size. You can compare to `clientChunkSummary.totalAssetSize` / `serverChunkSummary.totalAssetSize` in the same report.
5. Run a second analysis with another name (e.g. `post-measurement-fix-2`), then compare the two reports. The comparison should show deltas for "Client Bundle Size" / "Server Bundle Size" based on these values.
6. Ensure `npm run lint` passes in the bundle-analyzer package and that the app build still runs (e.g. `npm run build` in `apps/web` as triggered by the analyzer).

## Success Criteria

- Client and server "bundle size" in reports and comparisons use **total asset size** from stats when available.
- Fallback to HTML size when stats are missing keeps reports and comparisons working.
- Lint passes and analyzer + comparison run without errors.
