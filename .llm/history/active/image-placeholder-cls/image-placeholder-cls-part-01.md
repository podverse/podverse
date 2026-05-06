# image-placeholder-cls

## Metadata

- **Started:** 2026-05-05
- **Author:** Agent
- **Context:** Prevent layout shift when placeholder artwork vs loaded image in apps/web Image component

---

### Session 1 - 2026-05-05

#### Prompt (Developer)

use outline

#### Key Decisions

- Replaced `border` on `.imagePlaceholder` with `outline` + `outline-offset: -1px` so the fallback ring does not change border-box size versus successfully loaded images (`apps/web/src/styles/components/Image/Image.module.scss`).

#### Files Created/Modified

- `apps/web/src/styles/components/Image/Image.module.scss`
- `.llm/history/active/image-placeholder-cls/image-placeholder-cls-part-01.md`

---

### Session 2 - 2026-05-05

#### Prompt (Developer)

the placeholder image should have padding within the image wrapper so that the image itself appears to be smaller. i would make it approx 1/3 smaller than the wrapper size (the image wrapper should stay the same size only the image contents should appear smaller)

#### Key Decisions

- Placeholder branch wraps artwork in `.placeholderOuter` with inline `width`/`height` matching props (same slot as loaded image).
- Inner `NextImage` uses `Math.round((dim * 2) / 3)` (~⅓ smaller per axis than wrapper = visually inset).
- Consumer `className` (e.g. margin, border-radius) applies to the wrapper; `overflow: hidden` respects rounded corners.
- Ring uses `box-shadow: inset 0 0 0 1px` (no layout shift; not clipped by `overflow` like `outline`).

#### Files Created/Modified

- `apps/web/src/components/Image/Image.tsx`
- `apps/web/src/styles/components/Image/Image.module.scss`
- `.llm/history/active/image-placeholder-cls/image-placeholder-cls-part-01.md`

---

### Session 3 - 2026-05-05

#### Prompt (Developer)

the list view works but the grid view is breaking. can you fix this at the image level

#### Key Decisions

- Grid list nodes use [`ListGridNode.module.scss`](apps/web/src/styles/components/Common/List/ListGridNode.module.scss) `.image` with `width: 100%` + `aspect-ratio: 1 / 1`. Placeholder had inline `style={{ width: 600, height: 600 }}` from props (`IMAGES.LIST.GRID.SIZE`), forcing huge boxes that broke CSS grid.
- When `width`/`height` both equal `IMAGES.LIST.GRID.SIZE`, treat as fluid grid slot: **omit inline dimensions** on `.placeholderOuter`, add `.placeholderOuterFluid` (`min-width: 0`, `width: 100%`, etc.), and `.imagePlaceholderFluid` so the bitmap stays ~⅔ of the slot via `width: calc(200% / 3)`.

#### Files Created/Modified

- `apps/web/src/components/Image/Image.tsx`
- `apps/web/src/styles/components/Image/Image.module.scss`
- `.llm/history/active/image-placeholder-cls/image-placeholder-cls-part-01.md`

---

### Session 4 - 2026-05-05

#### Prompt (Developer)

Image: default placeholder, replace when artwork loads

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- When `src` is present and not in error: render `imageSlot` wrapper (fluid vs fixed unchanged), show decorative placeholder (`alt=""`, `aria-hidden`) until `onLoadingComplete`, then unmount placeholder; real image uses `realImageLayer` + `realImagePending` / `realImageReady` (opacity, absolute fill).
- `useEffect([src, skipProxy])` resets `remoteLoaded` and `imageError` when the requested URL changes (does not clear error until `src`/`skipProxy` change).
- Fluid grid (`IMAGES.LIST.GRID.SIZE`): consumer `className` on wrapper for slot margin/layout; inner uses `realImageFillGrid` so absolutely positioned artwork matches ListGridNode intent without duplicate margins on img.
- Placeholder scale unified to ⅔ (`(dim * 2) / 3` and `calc(200% / 3)`).

#### Files Created/Modified

- `apps/web/src/components/Image/Image.tsx`
- `apps/web/src/styles/components/Image/Image.module.scss`
- `.llm/history/active/image-placeholder-cls/image-placeholder-cls-part-01.md`

---

### Session 5 - 2026-05-05

#### Prompt (Developer)

instead of shrinking placeholder by / 3 you should shrink by / 2.5

#### Key Decisions

- Placeholder pixel props and fluid `calc` use `(dim * 2) / 2.5` and `calc(200% / 2.5)` instead of `/ 3`.

#### Files Created/Modified

- `apps/web/src/components/Image/Image.tsx`
- `apps/web/src/styles/components/Image/Image.module.scss`
- `.llm/history/active/image-placeholder-cls/image-placeholder-cls-part-01.md`

---

### Session 6 - 2026-05-05

#### Prompt (Developer)

the placeholder image should NOT load by default everywhere, but you should pass in a prop so it does load (until the actual image loads) in the core media components everywhere

#### Key Decisions

- Shared `Image` gains optional **`placeholderUntilLoaded`**; effective behavior is **`placeholderUntilLoaded ?? useImagePlaceholderUntilLoaded()`** so Core can opt in via prop or `ImagePlaceholderUntilLoadedProvider`.
- When **`placeholderUntilLoaded` is false** (default, no provider): with a valid **`src`**, render **only** the real `NextImage` (no decorative placeholder layer until load).
- **`ImagePlaceholderUntilLoadedProvider`** wraps Core list/grid node wrappers so thumbnails use placeholder-until-loaded without changing Common defaults.
- **`CommonItemHeader`** accepts **`placeholderUntilLoaded`** (default false); Core headers (`CoreEpisodeHeader`, `CoreTrackHeader`, Core \*HeaderImage components) pass **`placeholderUntilLoaded`** for artwork.

#### Files Created/Modified

- `apps/web/src/contexts/ImagePlaceholderUntilLoaded.tsx`
- `apps/web/src/components/Image/Image.tsx`
- `apps/web/src/components/Common/Item/CommonItemHeader.tsx`
- Core wrappers/providers and headers under `apps/web/src/components/Core/` (podcast, artist, album, episode, livestream, track, combined channels)
- `.llm/history/active/image-placeholder-cls/image-placeholder-cls-part-01.md`

---

### Session 7 - 2026-05-06

#### Prompt (Developer)

Skip placeholder flash when artwork is already cached

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- When **`placeholderUntilLoaded`** is true and **`src`** is valid: **`useLayoutEffect`** runs **`getImageProps`** (same **`src`**, **`width`**, **`height`**, **`priority`**, **`quality: 75`**, **`alt`**) and probes **`props.src`** (optimizer URL) with **`document.createElement('img')`**; if **`complete && naturalWidth`** after assignment or **`onload`**, **`setRemoteLoaded(true)`** before paint when cache-hot; **`onLoadingComplete`** remains for slow/cold loads.
- **`useEffect`** on **`[src, skipProxy]`** now only clears **`imageError`** (no longer resets **`remoteLoaded`**—handled in layout effect).
- Avoid **`new Image()`** — name collision with **`NextImage`** import in scope.

#### Files Created/Modified

- `apps/web/src/components/Image/Image.tsx`
- `.llm/history/active/image-placeholder-cls/image-placeholder-cls-part-01.md`

---

### Session 8 - 2026-05-06

#### Prompt (Developer)

i don't think that worked. when i refresh the page, all the images use the placeholder, and then like 0.5 seconds later the proper images load, even though i want and expect most of these images to load the actual images (non-placeholder) instantly from cache for best ux

#### Key Decisions

- Cache probe previously set only **`img.src`** while `<NextImage>` emits **`src` + `srcSet`** (different **`w=`** per DPR); the browser often loads the **srcSet** candidate, so the probe missed the HTTP cache entry and **`complete`** stayed false until **`onload`** (~hundreds of ms).
- Probe **`img`** now mirrors **`props.srcSet`** / **`props.sizes`** from **`getImageProps`** when present; added **`queueMicrotask`** re-check, **`img.decode().then(finish)`** with **`finished`** guard, and **`loading="eager"`** on the real **`NextImage`** when **`priority`** is false so lazy-loading does not defer work.

#### Files Created/Modified

- `apps/web/src/components/Image/Image.tsx`
- `.llm/history/active/image-placeholder-cls/image-placeholder-cls-part-01.md`

---

### Session 9 - 2026-05-06

#### Prompt (Developer)

Skeleton-only loading; headphone for missing/error only

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Removed **`placeholderUntilLoaded`**, **`ImagePlaceholderUntilLoadedProvider`**, **`useLayoutEffect`** cache probe, and **`remoteLoaded`** layering — headphone placeholder **only** for **`!src`** or **`onError`**.
- Successful **`src`**: single **`<NextImage>`** with **`classNames(styles.skeletonBg, className)`** — subtle **`background-color: var(--border-color-opaque)`** while bytes decode; cached images paint over immediately without React-gated swap.
- Deleted **`apps/web/src/contexts/ImagePlaceholderUntilLoaded.tsx`**; stripped provider wrappers from Core **Nodes/Row/GridNode** files and **`placeholderUntilLoaded`** from **`CommonItemHeader`** + Core episode/track headers + Core \*HeaderImage components.
- Removed unused SCSS (slot/real-image layers); added **`.skeletonBg`**.
- **Production caching**: **`Cache-Control: public, max-age=86400, s-maxage=86400`** on successful **`/api/proxy`** responses; **`images.minimumCacheTTL: 86400`** in **`next.config.mjs`**.

#### Files Created/Modified

- `apps/web/src/components/Image/Image.tsx`
- `apps/web/src/styles/components/Image/Image.module.scss`
- `apps/web/src/components/Common/Item/CommonItemHeader.tsx`
- `apps/web/src/components/Core/Podcast/Episodes/CoreEpisodeHeader.tsx`
- `apps/web/src/components/Core/Artist/Album/Track/CoreTrackHeader.tsx`
- `apps/web/src/components/Core/Podcast/CorePodcastHeaderImage.tsx`
- `apps/web/src/components/Core/Artist/CoreArtistHeaderImage.tsx`
- `apps/web/src/components/Core/Artist/Album/CoreAlbumHeaderImage.tsx`
- Core list/grid wrappers under `apps/web/src/components/Core/` (podcast, artist, album, episode, livestream, track, combined channels)
- `apps/web/src/app/api/proxy/route.ts`
- `apps/web/next.config.mjs`
- Deleted: `apps/web/src/contexts/ImagePlaceholderUntilLoaded.tsx`
- `.llm/history/active/image-placeholder-cls/image-placeholder-cls-part-01.md`
