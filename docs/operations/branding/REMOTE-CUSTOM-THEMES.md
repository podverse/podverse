# Remote custom themes (operator guide)

Podverse **web** and **management-web** can load extra UI color themes from a **remote JSON file** hosted on your CDN or static site. Each theme overrides the same CSS custom properties used by built-in themes (`dark`, `light`, `dracula`, `violet`) in [`packages/ui/src/styles/_themes.scss`](/packages/ui/src/styles/_themes.scss).

Built-in themes stay in the app image. Remote themes are **additive**: they appear in Settings → Theme alongside native options when configured.

## Quick start (production smoke test)

1. Copy the committed operator sample from the repo:
   [`custom-themes.operator-sample.json`](custom-themes.operator-sample.json)
2. Upload it to HTTPS static hosting (S3 + CloudFront, GCS, your CDN, etc.). Example URL:
   `https://cdn.example.com/podverse/custom-themes.operator-sample.json`
3. Set **`NEXT_PUBLIC_CUSTOM_THEMES_URL`** to that URL in **both** runtime-config sidecars:
   - [`apps/web/sidecar/.env`](/apps/web/sidecar/.env) (local) or web sidecar ConfigMap / env in GitOps
   - [`apps/management-web/sidecar/.env`](/apps/management-web/sidecar/.env) (local) or management-web sidecar env in GitOps
   - Local override stub: [`dev/env-overrides/local/theme.env.example`](/dev/env-overrides/local/theme.env.example) → `CUSTOM_THEMES_URL=`
4. Restart web and management-web pods (or local containers) so SSR fetches the pack at startup.
5. Open **Settings → General → Theme** on web (or the management theme switcher). You should see three sample themes:
   **Verdigris Forge**, **Lichen Bark**, and **Dusk Plum** (ids `custom_verdigris_forge`, `custom_lichen_bark`, `custom_dusk_plum`).
6. Select each theme and spot-check buttons, links, tables, and the media player progress bar.

The sample uses deliberately uncommon palettes so they are unlikely to collide with a real operator brand theme.

## JSON format

Remote packs are **JSON**, not raw CSS. The app converts each theme’s `cssVariables` map into injected CSS at SSR:

```json
{
  "version": "2026-06-03",
  "themes": [
    {
      "id": "custom_my_brand",
      "labels": {
        "en-US": "My Brand Dark",
        "es": "Mi marca oscura"
      },
      "cssVariables": {
        "--background-color-primary": "#121816",
        "--text-color-primary": "#e8f2ef"
      }
    }
  ]
}
```

| Field | Rules |
| ----- | ----- |
| `version` | Non-empty string (opaque to the app; bump when you change the file). |
| `themes` | Non-empty array; each `id` must be unique. |
| `themes[].id` | Lowercase letters, digits, `_`, `-` only (normalized to lowercase). Must **not** match a built-in id (`dark`, `light`, `dracula`, `violet`). |
| `themes[].labels` | Optional locale → display name map (e.g. `en-US`, `es`). |
| `themes[].cssVariables` | Object of `--*` property names to CSS values (colors, gradients, shadows). |

**Variable names:** Use the exact tokens from `_themes.scss` (for example `--background-color-primary`, `--button-primary-bg`). Do **not** invent alternate names such as `--pv-color-bg-primary`; the UI reads `var(--background-color-primary)`.

**Full override:** For production-quality themes, set **every** theme-scoped variable (61 keys today). The operator sample lists all of them. Partial packs work for experiments but may leave buttons or progress bars on inherited values.

**Gradients:** Use a single-line string, e.g. `"linear-gradient(90deg, rgba(45, 106, 95, 0.72) -3%, #1c2623)"`.

## URL and security

| Rule | Detail |
| ---- | ------ |
| Production | **`https://` only** |
| Local dev | `http://localhost:…` or `http://127.0.0.1:…` allowed |
| Fetch | Server-side at web/management-web startup (3s timeout); cached per process |
| Failure | Invalid URL, HTTP error, or invalid JSON **fails startup** (fail-fast) |

Set env on the **runtime-config sidecar**, not only on the Next.js container. Sidecar maps `CUSTOM_THEMES_URL` → `NEXT_PUBLIC_CUSTOM_THEMES_URL` during local setup; in K8s, set `NEXT_PUBLIC_CUSTOM_THEMES_URL` on the sidecar env bundle web/management-web read at runtime.

## Operator sample vs E2E test fixtures

| Artifact | Location | Purpose |
| -------- | -------- | ------- |
| **Operator sample** | [`custom-themes.operator-sample.json`](custom-themes.operator-sample.json) | Full 61-variable reference; copy for production/CDN testing |
| **E2E fixtures** | [`tools/test-assets/assets/themes/`](/tools/test-assets/assets/themes/) | Minimal/partial JSON for deterministic Playwright runs on `localhost:2111` |

Do **not** point production at the E2E fixtures. They intentionally use small variable sets and theme ids (`custom_midnight_ocean`, etc.) tied to automated tests. See [`tools/test-assets/TOOLS-TEST-ASSETS.md`](/tools/test-assets/TOOLS-TEST-ASSETS.md).

## Maintaining your own pack

1. Start from [`custom-themes.operator-sample.json`](custom-themes.operator-sample.json).
2. Rename theme `id`s and `labels`; adjust colors.
3. When upgrading Podverse, diff `_themes.scss` against your file and add any new `--*` keys.
4. Re-upload JSON; restart web/management-web (or roll pods) to refetch.

## Related docs

- [REBRANDING-CDN.md](/docs/development/REBRANDING-CDN.md) — logos, favicons, manifest colors via env (separate from full theme packs)
- [`styles-source-of-truth`](/.cursor/skills/styles-source-of-truth/SKILL.md) — where theme tokens are defined in code
