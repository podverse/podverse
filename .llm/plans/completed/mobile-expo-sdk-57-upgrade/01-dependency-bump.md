# 01 — Dependency bump (Expo 57 / RN 0.86)

**Cursor model:** Codex 5.3 · **Reasoning:** high

## Goal

Move `apps/mobile` package pins from Expo SDK 52 / RN 0.76 / React 18.3 to
Expo SDK 57 / RN 0.86 / React 19.2 and regenerate the mobile lockfile. No
call-site API rewrites in this prompt (those are 02 / 03).

## Preconditions

- Operator completed Step 0 in [00-EXECUTION-ORDER.md](./00-EXECUTION-ORDER.md)
  (EAS baseline committed on a branch).
- Locked decisions in [00-SUMMARY.md](./00-SUMMARY.md).

## Files to change

- [`apps/mobile/package.json`](../../../../apps/mobile/package.json)
- [`apps/mobile/package-lock.json`](../../../../apps/mobile/package-lock.json)
  (via install)
- [`apps/mobile/babel.config.js`](../../../../apps/mobile/babel.config.js)

Do **not** edit `src/**`, plugins, modules, or docs in this prompt.

## Steps

### 1. Edit `package.json` core pins

Set (exact patch within the Expo 57 / RN 0.86 line is chosen by
`expo install --fix` in step 3; start with these ranges):

- `"expo": "~57.0.0"` (or the current latest `57.0.x` after install)
- `"react": "19.2.x"` matching the Expo 57 template
- `"react-native": "0.86.x"` matching the Expo 57 template
- `"@types/react": "~19.1.0"` (or whatever `expo install` resolves for SDK 57)

Collapse `overrides`:

- Top-level `"expo"` and `"react-native"` → new versions only
- Nested overrides that only pinned Expo 52 for
  `expo-dev-launcher` / `expo-dev-menu` / `expo-dev-menu-interface` /
  `expo-manifests` / `expo-updates-interface` / `@expo/dom-webview`:
  **remove** those nested blocks and the matching **direct** dependencies
  unless `rg` under `apps/mobile` finds a source import of them
- Keep `"@xmldom/xmldom": "0.8.10"`
- **Drop** `"tar": "6.2.1"`. If a later prebuild fails with
  `reading 'extract'`, restore it in a follow-up edit and document in 07

Add `"react-native-worklets"` as a dependency (version from Expo 57
`bundledNativeModules` / `expo install` — expected ~`0.10.1` with
Reanimated 4.5.x).

Bump `"expo-iap"` to the latest **5.x** that installs cleanly with Expo 57
(install in step 3; do not stay on 2.6.3). Call-site rewrite is Prompt 03.

### 2. Babel

In `babel.config.js`, remove `'react-native-reanimated/plugin'` from
`plugins`. `babel-preset-expo` on SDK 57 adds the worklets plugin. Keep
`presets: ['babel-preset-expo']`.

### 3. Install and align peers

From monorepo root (prefer **Mobile** tab):

```bash
npm --prefix apps/mobile exec -- expo install --fix
npm run mobile:install
```

Then bump navigation peers if still on old minors:

```bash
npm --prefix apps/mobile exec -- expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
```

Or edit `package.json` to latest 7.x and re-run `npm run mobile:install`.

Confirm `legacy-peer-deps=true` remains in `apps/mobile/.npmrc`.

### 4. Sanity without full type-check rewrite

Confirm `apps/mobile/node_modules/expo/package.json` reports `57.x` and
`react-native` reports `0.86.x`. Do **not** chase every TypeScript error
here — that is 02 / 03. If `expo install` fails, fix the pin conflict in
`package.json` / overrides and retry.

## Ownership

- **Owns:** mobile package.json, lockfile, babel.config.js
- **Must not:** rewrite imports under `src/`, touch plugins/modules/docs

## Done when

- Lockfile committed-ready under `apps/mobile/`
- Expo resolves to 57.x, RN to 0.86.x
- `react-native-worklets` is present; reanimated babel plugin removed
- `expo-iap` is on 5.x in package.json / lockfile

## Agent verify (this set — run these)

```bash
npm --prefix apps/mobile exec -- expo --version
node -p "require('./apps/mobile/node_modules/expo/package.json').version"
node -p "require('./apps/mobile/node_modules/react-native/package.json').version"
node -p "require('./apps/mobile/node_modules/expo-iap/package.json').version"
```

Report the four version lines in the final response. If Expo is not 57.x or
RN is not 0.86.x or expo-iap is not 5.x, fix pins and re-install before
ending.
