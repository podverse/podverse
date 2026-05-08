# 01 — Policy, rules, and skills

## Goal

Make shared-UI-first and web-first style convergence explicit in Cursor rules, `reusable-components` skill, `.cursorrules`, and `AGENTS.md`.

## Prompt

Implement policy hardening for shared UI convergence:

- Add `.cursor/rules/prefer-shared-ui-web-management.mdc` scoped to `apps/web/src/**/*.tsx` and `apps/management-web/src/**/*.tsx`.
- Update `.cursor/rules/management-web-prefer-shared-ui.mdc` to align with the cross-app rule (avoid contradicting guidance).
- Update `.cursor/skills/reusable-components/SKILL.md` with web-first baseline when reconciling overlap between apps.
- Surface the same priorities early in `.cursorrules` and `AGENTS.md`.

## Done when

- Agents see one clear policy: `@podverse/ui` first; one shared implementation when both apps overlap; prefer existing **web** visuals when styles conflict unless a11y/product docs say otherwise.
