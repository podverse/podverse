# Operator custom themes from remote JSON — summary

## Execution context (required)

- Work only from `~/r/p/podverse-custom-css-remote-file`
- Branch must be `feature/custom-css-remote-file`

## Goal

Add optional operator-provided custom theme packs for Podverse and Metaboost web + management-web, loaded from an env-configured remote JSON file.

## Locked behavior

- Custom themes are always available when custom theme URL is configured.
- Custom themes do not need to be listed in `NEXT_PUBLIC_SUPPORTED_THEMES`.
- If custom theme URL resolves, always ignore `NEXT_PUBLIC_DEFAULT_THEME`.
- The first theme in the custom JSON is always the default.
- URL policy: allow `https://*` plus local dev HTTP only (`http://localhost` and `http://127.0.0.1`).
- Theme labels may include locale-specific display names (`labels` map), but no remote locale message catalogs.
- First render must apply selected theme values (no FOUC).
- If custom URL is configured but fetch/validation fails, fall back to built-in themes and normal `NEXT_PUBLIC_DEFAULT_THEME` behavior.

## Required test coverage

- No custom file configured.
- Only custom file configured (no `NEXT_PUBLIC_SUPPORTED_THEMES` and no `NEXT_PUBLIC_DEFAULT_THEME`).
- Custom file configured together with `NEXT_PUBLIC_SUPPORTED_THEMES` + `NEXT_PUBLIC_DEFAULT_THEME`.
- Assert custom-file default precedence in all combinations where custom file is present.

## Fixture requirement

Create a custom theme JSON fixture in test-assets so local HTTP hosting can be used in development and E2E.

## Durability guardrail

Whenever theme CSS variables are added/removed/renamed, update the maintained custom-theme fixture JSON files and
theme/env docs in the same change (Podverse + Metaboost abcmemory requirement added in prompt 05).

## Plan outputs

- Podverse implementation phases and touched surfaces.
- Metaboost implementation phases and touched surfaces (mirrored plan set in Metaboost repo, execution deferred).
- E2E/env matrix plan for both repos.
- Abcmemory follow-up to keep example theme files/docs aligned when CSS vars change.
