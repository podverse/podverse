# Copy-pasta — embed demo PD locale assets

- [x] **Phase 1** — Execute [`01-pd-content-research-and-licensing.md`](./01-pd-content-research-and-licensing.md)
- [x] **Phase 2** — Execute [`02-asset-pipeline-transcode-and-layout.md`](./02-asset-pipeline-transcode-and-layout.md)
- [x] **Phase 3** — Execute [`03-commit-en-us-assets.md`](./03-commit-en-us-assets.md)
- [x] **Phase 4** — Execute [`04-commit-es-fr-el-gr-assets.md`](./04-commit-es-fr-el-gr-assets.md)
- [x] **Phase 5** — Execute [`05-seed-constants-and-enclosures-refactor.md`](./05-seed-constants-and-enclosures-refactor.md)
- [x] **Phase 6** — Execute [`06-runtime-locale-showcase-and-i18n.md`](./06-runtime-locale-showcase-and-i18n.md)
- [x] **Phase 7** — Execute [`07-video-primary-hosting.md`](./07-video-primary-hosting.md)
- [x] **Phase 8** — Execute [`08-e2e-docs-and-cleanup.md`](./08-e2e-docs-and-cleanup.md)

Final verification:

```bash
npm run lint
npm run test:unit
make e2e_seed_web
make e2e_test_web_report_spec SPEC=e2e/embed-routes.spec.ts
make e2e_test_web_report_spec SPEC=e2e/embed-demo-index.spec.ts
```
