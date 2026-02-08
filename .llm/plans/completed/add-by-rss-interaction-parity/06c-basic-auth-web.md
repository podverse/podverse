# 06c: Basic Auth for Add-by-RSS – Web UI

## Goal

The **add-feed** screen has an optional Basic Auth section (toggle, collapsed
by default, username/password fields). Password never shown after save.

**Scope**: Add-feed only. There is no edit-feed capability; Basic Auth is only
provided when adding a feed.

**Parent**: [06-basic-auth.md](06-basic-auth.md). Depends on [06a](06a-basic-auth-schema-orm.md), [06b](06b-basic-auth-api.md). See [06d](06d-basic-auth-request-paths.md) for request-path checklist.

---

## Web app path

- **Add feed**: `apps/web/src/app/add-by-rss/add/AddByRSSAddFeedPageClient.tsx`
  — route `/add-by-rss/add`. This is the “add add-by-RSS feed” form. Add the
  Basic Auth section here.

---

## Step 1: Add feed screen

- In the add-feed form (`AddByRSSAddFeedPageClient.tsx`), add an **optional**
  section for Basic Auth:
  - **Toggle**: “Use Basic Auth” or “This feed requires username/password”.
  - **Collapsed by default**: Username + password fields hidden until toggle on.
  - **Fields**: Username (text), Password (password input). No prefill; never
    show existing password (N/A for add).

---

## Step 2: Submit

- Include `basic_auth_username` and `basic_auth_password` (if provided) in the
  request body on follow (the same API endpoint upserts by feed_url; there is no
  separate edit-feed flow). Clear password from client state after successful
  submit; do not keep in memory longer than needed.

**Audit**: Add feed with Basic Auth off → no credentials sent. Add feed with
toggle on and username/password → credentials sent and not echoed back.

---

## Deliverables checklist

- [ ] Add-feed: optional Basic Auth section (toggle, collapsed by default,
  username/password). No edit-feed (add-feed only).
- [ ] Submit sends credentials when provided; client clears password after
  submit.

---

## Files reference

| Area       | Path |
| ---------- | ---- |
| Add feed   | `apps/web/src/app/add-by-rss/add/AddByRSSAddFeedPageClient.tsx` |
