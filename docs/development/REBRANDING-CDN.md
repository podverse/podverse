# Rebranding and CDN-hosted assets

This guide is for **operators** who run official container images but want custom **names, colors, icons, and logos** without baking files into a new image. The **web** and **management-web** apps read `NEXT_PUBLIC_*` values at **runtime** from the [runtime-config sidecar](/apps/web/ENV.md#overview) (and `process.env` in local dev). Set each URL to a full **`https://`…** address on your CDN (or any static host); path-absolute URLs like `/favicon/...` use files shipped in the image instead.

**Scope:** [`apps/web`](/apps/web) (main site) and [`apps/management-web`](/apps/management-web) (admin UI). Management web uses the same PWA manifest and head-icon pattern as web; only **web** has optional **in-app header logos** below.

For **CDN URLs** and **`NEXT_PUBLIC_*` / API env names**, use the sections below (**Brand text** through **Brand banner 3:1**).

## Bundled files and dimensions (quick reference)

Replace files under each app’s `public/` tree to rebrand **without** pointing env vars at a CDN. Paths are URL paths as served by the app (leading `/`).

| Area                    | Default file (web app)                                                                                                                       | Dimensions / notes                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Light-theme UI wordmark | [`apps/web/public/branding/logo.svg`](/apps/web/public/branding/logo.svg) (`/branding/logo.svg`)                                        | Dark artwork on light backgrounds; used when the UI theme is **light** ([`getBrandLogoSrc`](/apps/web/src/utils/brandLogo.ts)). Nav and footer render at **144×25** px ([`NavBarBrand`](/apps/web/src/components/NavBar/NavBarBrand.tsx), [`FooterBrand`](/packages/ui/src/components/layout/FooterLayout/FooterBrand.tsx) defaults). Prefer **SVG**. |
| Dark-theme UI wordmark  | [`apps/web/public/branding/logo-dark.svg`](/apps/web/public/branding/logo-dark.svg) (`/branding/logo-dark.svg`)                         | Light artwork on dark backgrounds; used for **dark**, **dracula**, and **violet** themes. Same **144×25** display size.                                                                                                                                                                                                                                              |
| Email / API banner      | [`apps/web/public/branding/banner_3x1.png`](/apps/web/public/branding/banner_3x1.png) (`/branding/banner_3x1.png`)                      | **3:1** width:height. The API reads **`BRAND_BANNER_IMAGE_3X1_URL`** (must be an absolute URL); see [Brand banner 3:1 (API)](#brand-banner-31-api) and [apps/api/ENV.md](/apps/api/ENV.md#email-configuration).                                                                                                                                                 |
| PWA manifest icons      | `apps/web/public/favicon/web-app-manifest-192x192.png`, `web-app-manifest-512x512.png`                                                       | **192×192** and **512×512** PNG, **maskable** ([`manifest.ts`](/apps/web/src/app/manifest.ts)).                                                                                                                                                                                                                                                                 |
| Document head icons     | `favicon.svg`, `favicon.ico`, `favicon-96x96.png`, `apple-touch-icon.png` under [`apps/web/public/favicon/`](/apps/web/public/favicon) | **96×96** PNG; **180×180** typical for Apple touch ([`FavIcons`](/packages/ui/src/components/head/FavIcons/FavIcons.tsx)); SVG and ICO cover modern and older browsers.                                                                                                                                                                                         |

**Management UI:** There are no in-app header logos in runtime config ([`management-web` config](/apps/management-web/src/config/index.ts) exposes brand name and domain only). Rebrand **install and tab icons** the same way as web: **`NEXT_PUBLIC_BRAND_*`** for URLs, or replace the bundled files under [`apps/management-web/public/favicon/`](/apps/management-web/public/favicon) using the **same filenames** as web for consistency.

**App store badges:** Images under [`apps/web/public/images/mobile/app-stores/`](/apps/web/public/images/mobile/app-stores) are marketing graphics and are **not** driven by brand env vars; update them only if you ship those store links.

---

## Brand text (no image files)

| Variable                   | Role                                                                                                      |
| -------------------------- | --------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_BRAND_NAME`   | Shown in the UI and used for the web app manifest **`name`** and **`short_name`** (same string for both). |
| `NEXT_PUBLIC_BRAND_DOMAIN` | Domain string for links and config (not a URL to an image).                                               |

---

## Brand: app + document chrome (`/manifest.webmanifest` and HTML `<head>`)

These `NEXT_PUBLIC_BRAND_*` variables control the [web app manifest](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest) (installable app icon, theme, background) and the **tab / bookmark / platform** icons in the document head. The same values can be reused in other app surfaces; names are generic, not PWA-only. For raster icons, use **maskable** safe zones at the listed sizes. In local `brand.env`, set **`BRAND_BACKGROUND_COLOR`**; `local_env_setup` maps it to `NEXT_PUBLIC_BRAND_BACKGROUND_COLOR` in the sidecar.

| Variable                                 | Asset to create / type                 | Brief role                                                        |
| ---------------------------------------- | -------------------------------------- | ----------------------------------------------------------------- |
| `NEXT_PUBLIC_BRAND_APP_ICON_192_URL`     | **192×192** PNG, `image/png`, maskable | Smaller **install / launcher** icon and other app surfaces.       |
| `NEXT_PUBLIC_BRAND_APP_ICON_512_URL`     | **512×512** PNG, `image/png`, maskable | Larger **install / splash** icon and high-DPI use.                |
| `NEXT_PUBLIC_BRAND_THEME_COLOR`          | _(CSS color, not a file — e.g. hex)_   | **Browser / app UI chrome** tint.                                 |
| `NEXT_PUBLIC_BRAND_BACKGROUND_COLOR`     | _(CSS color)_                          | **Background** for app shell, launch, manifest.                   |
| `NEXT_PUBLIC_BRAND_FAVICON_SVG_URL`      | **SVG** (scalable)                     | **Primary favicon** in modern browsers.                           |
| `NEXT_PUBLIC_BRAND_FAVICON_ICO_URL`      | **ICO** (often multi-size)             | **ICO favicon** and some older clients.                           |
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
| **Path on the public web app** | **`/branding/banner_3x1.png`** — file lives in [`apps/web/public/branding/`](/apps/web/public/branding) in the repo.                                 |
| **Production example**         | `https://<your-web-domain>/branding/banner_3x1.png`                                                                                                        |
| **GitOps / alternate host**    | Host the file on your CDN; keep the filename **`banner_3x1.png`** and set the full URL in the API env (e.g. `https://<cdn>/static/images/banner_3x1.png`). |

Set **`BRAND_BANNER_IMAGE_3X1_URL`** in API env (ConfigMap, `brand` local overrides, etc.); see [apps/api/ENV.md](/apps/api/ENV.md#email-configuration).

---

## Where to configure

- **Production / Kubernetes:** runtime-config **sidecar** env (e.g. `web-sidecar` / `management-web-sidecar` ConfigMaps in your GitOps repo). See [apps/web/ENV.md](/apps/web/ENV.md) and [apps/management-web/ENV.md](/apps/management-web/ENV.md) for the full variable list and validation rules.
- **Local development:** [Local env overrides](./env/LOCAL-ENV-OVERRIDES.md) and [brand.env.example](/dev/env-overrides/local/brand.env.example) (PWA + favicon section) for path defaults merged by `make local_env_setup`.

Ensure your CDN sends **correct `Content-Type`** headers for images and allows **CORS** only if you load them in unusual contexts; same-origin `https` URLs to your own domain are the common case.
