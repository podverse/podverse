# Rebranding and CDN-hosted assets

This guide is for **operators** who run official container images but want custom **names, colors, icons, and logos** without baking files into a new image. The **web** and **management-web** apps read `NEXT_PUBLIC_*` values at **runtime** from the [runtime-config sidecar](../../apps/web/ENV.md#overview) (and `process.env` in local dev). Set each URL to a full **`https://`…** address on your CDN (or any static host); path-absolute URLs like `/favicon/...` use files shipped in the image instead.

**Scope:** [`apps/web`](../../apps/web) (main site) and [`apps/management-web`](../../apps/management-web) (admin UI). Management web uses the same PWA manifest and head-icon pattern as web; only **web** has optional **in-app header logos** below.

---

## Brand text (no image files)

| Variable                   | Role                                                                                                      |
| -------------------------- | --------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_BRAND_NAME`   | Shown in the UI and used for the web app manifest **`name`** and **`short_name`** (same string for both). |
| `NEXT_PUBLIC_BRAND_DOMAIN` | Domain string for links and config (not a URL to an image).                                               |

---

## Brand: app + document chrome (`/manifest.webmanifest` and HTML `<head>`)

These `NEXT_PUBLIC_BRAND_*` variables control the [web app manifest](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest) (installable app icon, theme, background) and the **tab / bookmark / platform** icons in the document head. The same values can be reused in other app surfaces; names are generic, not PWA-only. For raster icons, use **maskable** safe zones at the listed sizes. In local `brand.env`, set **`BRAND_BACKGROUND_COLOR`** (legacy: `BRAND_COLOR_BACKGROUND`); `local_env_setup` maps it to `NEXT_PUBLIC_BRAND_BACKGROUND_COLOR`.

| Variable                                 | Asset to create / type                 | Brief role                                                        |
| ---------------------------------------- | -------------------------------------- | ----------------------------------------------------------------- |
| `NEXT_PUBLIC_BRAND_APP_ICON_192_URL`     | **192×192** PNG, `image/png`, maskable | Smaller **install / launcher** icon and other app surfaces.       |
| `NEXT_PUBLIC_BRAND_APP_ICON_512_URL`     | **512×512** PNG, `image/png`, maskable | Larger **install / splash** icon and high-DPI use.                |
| `NEXT_PUBLIC_BRAND_THEME_COLOR`          | _(CSS color, not a file — e.g. hex)_   | **Browser / app UI chrome** tint.                                 |
| `NEXT_PUBLIC_BRAND_BACKGROUND_COLOR`     | _(CSS color)_                          | **Background** for app shell, launch, manifest.                   |
| `NEXT_PUBLIC_BRAND_FAVICON_SVG_URL`      | **SVG** (scalable)                     | **Primary favicon** in modern browsers.                           |
| `NEXT_PUBLIC_BRAND_FAVICON_ICO_URL`      | **ICO** (often multi-size)             | **Legacy tab icon** and some older clients.                       |
| `NEXT_PUBLIC_BRAND_FAVICON_PNG_96_URL`   | **96×96** PNG                          | **Explicit PNG** for clients that request a fixed raster favicon. |
| `NEXT_PUBLIC_BRAND_APPLE_TOUCH_ICON_URL` | **180×180** PNG (typical)              | **Apple touch icon** (home screen on iOS).                        |

If these URLs are unset, the app falls back to files under **`/favicon/`** in the shipped `public/` tree (see `public/favicon` in the repo).

---

## In-app header logos (web app only)

The main **web** app can swap the **header / navigation** wordmark or logo without replacing files in the image.

| Variable                       | Typical asset         | Brief role                                                  |
| ------------------------------ | --------------------- | ----------------------------------------------------------- |
| `NEXT_PUBLIC_BRAND_LOGO_DARK`  | **SVG or raster URL** | Logo for **dark** backgrounds (e.g. light-colored artwork). |
| `NEXT_PUBLIC_BRAND_LOGO_LIGHT` | **SVG or raster URL** | Logo for **light** backgrounds (e.g. dark artwork).         |

If unset, the app uses bundled assets under `/branding/` in `public/`.

---

## Brand banner 3:1 (API)

The API reads **`BRAND_BANNER_IMAGE_3X1_URL`**: an **absolute** `http://` or `https://` URL (no path-only value) for a **3:1** brand banner image. It is used in **HTML email** today; the same variable can be wired to other features later.

| Convention                     | Value                                                                                                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Default filename**           | `banner_3x1.png` (3:1 width:height)                                                                                                                        |
| **Path on the public web app** | **`/branding/banner_3x1.png`** — file lives in [`apps/web/public/branding/`](../../apps/web/public/branding/) in the repo.                                 |
| **Production example**         | `https://<your-web-domain>/branding/banner_3x1.png`                                                                                                        |
| **GitOps / alternate host**    | Host the file on your CDN; keep the filename **`banner_3x1.png`** and set the full URL in the API env (e.g. `https://<cdn>/static/images/banner_3x1.png`). |

Set **`BRAND_BANNER_IMAGE_3X1_URL`** in API env (ConfigMap, `brand` local overrides, etc.); see [apps/api/ENV.md](../../apps/api/ENV.md#email-configuration).

---

## Where to configure

- **Production / Kubernetes:** runtime-config **sidecar** env (e.g. `web-sidecar` / `management-web-sidecar` ConfigMaps in your GitOps repo). See [apps/web/ENV.md](../../apps/web/ENV.md) and [apps/management-web/ENV.md](../../apps/management-web/ENV.md) for the full variable list and validation rules.
- **Local development:** [Local env overrides](./env/LOCAL-ENV-OVERRIDES.md) and [brand.env.example](../../dev/env-overrides/local/brand.env.example) (PWA + favicon section) for path defaults merged by `make local_env_setup`.

Ensure your CDN sends **correct `Content-Type`** headers for images and allows **CORS** only if you load them in unusual contexts; same-origin `https` URLs to your own domain are the common case.
