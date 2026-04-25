# Execution order

1. Land scripts and `allowed-targets.mjs` + `lib/copilot-adapter.mjs` + `export-from-cursor.mjs`.
2. Add `.llm/exports` scaffolding and run `npm run llm:exports:sync` once; commit generated tree.
3. Wire `package.json`, GitHub Actions, pre-commit guard, and docs.
4. Replicate the same in Metaboost and run sync there.
5. Dry-run: PR to `develop` with a `.cursor` change → verify job; merge → optional bot commit on `develop` (paths must include `.cursor` or scripts, not only `.llm/exports`).

All steps for this set are complete in the repository unless noted as follow-up in `00-SUMMARY.md`.
