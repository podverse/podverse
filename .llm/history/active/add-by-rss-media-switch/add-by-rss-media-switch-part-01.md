### Session 1 - 2026-02-15

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Use selected enclosure mediaType for add-by-RSS audio/video gating in MediaPlayerControllerAV, with fallback to resourceData.medium_id.
- Compute selected enclosure for add-by-RSS even when mpItem is null so the floating video portal can switch off/on with enclosure changes.

#### Files Modified

- apps/web/src/components/MediaPlayer/Controller/MediaPlayerControllerAV.tsx
- apps/web/src/components/MediaPlayer/Controller/Video/MediaPlayerVideoWrapper.tsx
