# 329-playlist-play-seed-autoqueue

**Master step:** 10.20
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- Playlist row play seeds auto-queue config like web list rows.

## Architecture notes

Match web `ListPlaylistResources` / playlist play seeding behavior.

## Edge cases / cross-track deps

- Playlist with one item
- Private playlist

## Acceptance criteria

- Playing a playlist item sets auto-queue source to that playlist + mode
- Subsequent ended events pull from seeded auto-queue (10.9)
- Manual upcoming still takes priority

## Web parity references

- Web playlist list row play + AutoQueue seed
- Mobile: `PlaylistDetailScreen`

## Verification

```bash
npm run mobile:e2e:test -- library
```

## Depends on

- 10.8–10.9, 10.14
