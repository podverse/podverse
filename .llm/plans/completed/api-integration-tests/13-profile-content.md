# 13 — Profile Content Routes

## Goal

Integration tests for public profile and authenticated my-profile content routes.

## Routes under test

### Profile (public) (`/api/v1/profile`)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/:account_id_text/podcasts/az` | Public profile podcasts A-Z |
| GET | `/:account_id_text/albums/az` | Public profile albums A-Z |
| GET | `/:account_id_text/playlists/az` | Public profile playlists A-Z |
| GET | `/:account_id_text/clips/recent` | Public profile clips recent |

### My Profile (authenticated) (`/api/v1/my-profile`)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/podcasts/az` | My profile podcasts A-Z |
| GET | `/albums/az` | My profile albums A-Z |
| GET | `/playlists/az` | My profile playlists A-Z |
| GET | `/clips/recent` | My profile clips recent |

## File

`apps/api/src/test/profile-content.test.ts`

## Test cases

### Public profile routes

- **200 /:account_id_text/podcasts/az** — mocks service, returns array of podcasts for the account
- **200 /:account_id_text/albums/az** — returns array of albums
- **200 /:account_id_text/playlists/az** — returns array of public playlists
- **200 /:account_id_text/clips/recent** — returns array of public clips
- **404 for nonexistent account** — mocks service to return null/empty

### My profile routes

- **200 /my-profile/podcasts/az** — authenticated, returns user's podcasts
- **200 /my-profile/albums/az** — authenticated, returns user's albums
- **200 /my-profile/playlists/az** — authenticated, returns user's playlists (including private)
- **200 /my-profile/clips/recent** — authenticated, returns user's clips (including private)
- **401 without auth** for each my-profile route

## Mocking strategy

- Mock profile content services from `@podverse/orm`
- Test that public routes only return public/shared content while my-profile routes return all content

## Verification

```bash
./scripts/nix/with-env npm run test -w apps/api -- src/test/profile-content.test.ts
```
