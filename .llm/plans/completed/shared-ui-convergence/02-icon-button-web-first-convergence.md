# 02 — IconButton (web-first)

## Goal

Align `@podverse/ui` `IconButton` with web header icon behavior (borderless / flex) while keeping management-web patterns (bordered control, danger, loading, `LinkComponent`).

## Prompt

- Extend `packages/ui` `IconButton` with `appearance` (`control` default, `ghost` for web header parity) and optional `accent` (e.g. gold).
- Support app `LinkComponent` when `href` and/or `onClick` is used (web `Link` pattern), with forwarded props (`color`, `type`, `target`, `rel`) as needed.
- Replace `apps/web/src/components/Media/Header/IconButton.tsx` with a thin wrapper around `@podverse/ui` (remove redundant module SCSS where tokens cover it).
- Update `IconButton` tests in `packages/ui`.

## Done when

- Web media headers use shared `IconButton` with ghost appearance; management storage row actions unchanged visually.
