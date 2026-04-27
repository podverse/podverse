# Rebranding and CDN-hosted assets

This guide is for **operators** who run official container images but want custom **names, colors, icons, and logos** without baking files into a new image. The **web** and **management-web** apps read `NEXT_PUBLIC_*` values at **runtime** from the [runtime-config sidecar](../../apps/web/ENV.md#overview) (and `process.env` in local dev). Set each URL to a full **`https://`…** address on your CDN (or any static host); path-absolute URLs like `/favicon/...` use files shipped in the image instead.

**Scope:** [`apps/web`](../../apps/web) (main site) and [`apps/management-web`](../../apps/management-web) (admin UI). Management web uses the same PWA manifest and head-icon pattern as web; only **web** has optional **in-app header logos** below.

---

## Brand text (no image files)

| Variable                   | Role                                                                                                  |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_BRAND_NAME`   | Shown in the UI and used for the PWA manifest **`name`** and **`short_name`** (same string for both). |
| `NEXT_PUBLIC_BRAND_DOMAIN` | Domain string for links and config (not a URL to an image).                                           |

---

## PWA web app manifest (`/manifest.webmanifest`)

These control the [web app manifest](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest) (installable app icon, theme in browser UI, splash-style background). **Create raster PNGs** at the exact sizes; use **maskable** safe zones so Android crops do not clip your mark.

| Variable                           | Asset to create                        | Brief role                                                                                     |
| ---------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_PWA_ICON_192_URL`     | **192×192** PNG, `image/png`, maskable | Smaller **install / launcher** icon and manifest icon entry.                                   |
| `NEXT_PUBLIC_PWA_ICON_512_URL`     | **512×512** PNG, `image/png`, maskable | Larger **install / splash** icon and high-DPI manifest entry.                                  |
| `NEXT_PUBLIC_PWA_THEME_COLOR`      | _(CSS color, not a file — e.g. hex)_   | **Browser UI chrome** (e.g. address bar) tint when the app is open.                            |
| `NEXT_PUBLIC_PWA_BACKGROUND_COLOR` | _(CSS color, not a file — e.g. hex)_   | **Background** behind the app during launch / in the manifest (often matches splash or brand). |

If these image URLs are unset, the app falls back to **PNG files under** `/favicon/` in the shipped `public/` tree.

---

## Tab, bookmark, and platform icons (HTML `<head>`)

These are the small icons browsers and OSes use for **tabs, bookmarks, “add to home screen,” and iOS home screen**. Host the formats you need; point each env var at the matching file on the CDN.

| Variable                           | Typical asset              | Brief role                                                             |
| ---------------------------------- | -------------------------- | ---------------------------------------------------------------------- |
| `NEXT_PUBLIC_FAVICON_SVG_URL`      | **SVG** (scalable)         | **Primary favicon** in modern browsers; crisp at any size.             |
| `NEXT_PUBLIC_FAVICON_ICO_URL`      | **ICO** (often multi-size) | **Legacy tab icon** and some older clients.                            |
| `NEXT_PUBLIC_FAVICON_PNG_96_URL`   | **96×96** PNG              | **Explicit PNG** size for clients that request a fixed raster favicon. |
| `NEXT_PUBLIC_APPLE_TOUCH_ICON_URL` | **180×180** PNG (typical)  | **Apple touch icon** when users save the site to the iOS home screen.  |

Defaults in the image live under `/favicon/` (see `public/favicon` in the repo).

---

## In-app header logos (web app only)

The main **web** app can swap the **header / navigation** wordmark or logo without replacing files in the image.

| Variable                       | Typical asset         | Brief role                                                  |
| ------------------------------ | --------------------- | ----------------------------------------------------------- |
| `NEXT_PUBLIC_BRAND_LOGO_DARK`  | **SVG or raster URL** | Logo for **dark** backgrounds (e.g. light-colored artwork). |
| `NEXT_PUBLIC_BRAND_LOGO_LIGHT` | **SVG or raster URL** | Logo for **light** backgrounds (e.g. dark artwork).         |

If unset, the app uses bundled assets under `/branding/` in `public/`.

---

## Where to configure

- **Production / Kubernetes:** runtime-config **sidecar** env (e.g. `web-sidecar` / `management-web-sidecar` ConfigMaps in your GitOps repo). See [apps/web/ENV.md](../../apps/web/ENV.md) and [apps/management-web/ENV.md](../../apps/management-web/ENV.md) for the full variable list and validation rules.
- **Local development:** [Local env overrides](./env/LOCAL-ENV-OVERRIDES.md) and [pwa-favicon.env.example](../../dev/env-overrides/local/pwa-favicon.env.example) for path defaults merged by `make local_env_setup`.

Ensure your CDN sends **correct `Content-Type`** headers for images and allows **CORS** only if you load them in unusual contexts; same-origin `https` URLs to your own domain are the common case.
