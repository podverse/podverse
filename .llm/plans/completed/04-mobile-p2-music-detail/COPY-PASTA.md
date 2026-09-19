# COPY-PASTA — Music detail

Order: [00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md) · Decisions: [00-SUMMARY.md](00-SUMMARY.md)

Requires **medium-foundations** complete first.

- [x] **01 — Album detail**
- [x] **02 — Artist detail**
- [x] **03 — Track detail and Library routes**
- [x] **04 — i18n, E2E, closeout**

---

## 01 — Album detail

**Cursor model:** Codex 5.3 · **Reasoning:** high

```
Implement .llm/plans/active/04-mobile-p2-music-detail/01-album-detail.md.

Rebuild AlbumDetailScreen on the channel-detail shell from medium-foundations: tracks / about /
podroll / settings (no boosts), season forward / backward / top with range, live items on page 1,
offline cached tracks. Prefer existing i18n keys.

Do not rebuild artist or TrackDetail in this step.
```

---

## 02 — Artist detail

**Cursor model:** Codex 5.3 · **Reasoning:** high

```
Implement .llm/plans/active/04-mobile-p2-music-detail/02-artist-detail.md.

Rebuild ArtistDetailScreen on the shell with publisher remote items (added before unadded), albums /
tracks / about / podroll / settings, no sort UI. Album rows open AlbumDetail; track rows open
TrackDetail (placeholder until 03 is fine).
```

---

## 03 — Track detail and Library routes

**Cursor model:** Codex 5.3 · **Reasoning:** high

```
Implement .llm/plans/active/04-mobile-p2-music-detail/03-track-detail-and-library.md.

Replace the TrackDetail placeholder with a real screen (album header band, play chrome, summary +
lyrics transcript). Register Album / Artist / Track on the Library stack and linking. No boosts,
chapters, or clips on track.
```

---

## 04 — i18n, E2E, closeout

**Cursor model:** Codex 5.3 · **Reasoning:** medium

```
Implement .llm/plans/active/04-mobile-p2-music-detail/04-i18n-e2e-closeout.md.

Reconcile keys across four locales. Add Maestro coverage for album → track and artist. Flip 762–764
to done, note 729 music half superseded, remove this plan set. End with ALL cumulative verification
for this set.
```
