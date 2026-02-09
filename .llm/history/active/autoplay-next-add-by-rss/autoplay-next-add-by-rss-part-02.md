# Autoplay Next (Add-by-RSS)

## Session 11 - 2026-02-09

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Added minimal client logs to trace queue load, active queue resources, and add-by-RSS play invocation on refresh.

#### Files Modified

- apps/web/src/components/Queue/QueueController.tsx
- apps/web/src/components/MediaPlayer/Controller/MediaPlayerController.tsx
- apps/web/src/hooks/usePlayAddByRSS.tsx

## Session 12 - 2026-02-09

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Ensured media player layout activates for add-by-RSS by including `mpAddByRSS` in MediaPlayer layout sync.
- Removed temporary minimal queue/controller/playAddByRSS logs used for refresh tracing.

#### Files Modified

- apps/web/src/components/MediaPlayer/MediaPlayer.tsx
- apps/web/src/components/Queue/QueueController.tsx
- apps/web/src/components/MediaPlayer/Controller/MediaPlayerController.tsx
- apps/web/src/hooks/usePlayAddByRSS.tsx

## Session 13 - 2026-02-09

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Update seek and jump handlers to sync `mpCurrentTime` immediately so progress updates while paused.

#### Files Modified

- apps/web/src/components/MediaPlayer/Controller/MediaPlayerControllerAV.tsx

## Session 14 - 2026-02-09

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Reset add-by-RSS history completion to persist `playback_position: '0'`.
- Clamp restored add-by-RSS and core positions to 0 if within 5 seconds of duration.

#### Files Modified

- apps/web/src/hooks/useAddByRSSPositionSave.tsx
- apps/web/src/hooks/usePlayAddByRSS.tsx
- apps/web/src/hooks/useMediaPlayerResourceUpdate.tsx

## Session 15 - 2026-02-09

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Clear now-playing state when ended and no upcoming queue items to hide the media player.
- Skip add-by-RSS play-next behavior when the queue is empty to keep the player hidden.

#### Files Modified

- apps/web/src/components/MediaPlayer/Controller/Audio/MediaPlayerControllerAudio.tsx
- apps/web/src/components/MediaPlayer/Controller/Video/MediaPlayerControllerVideo.tsx
- apps/web/src/components/MediaPlayer/Controller/MediaPlayerControllerAV.tsx

## Session 16 - 2026-02-09

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Always move add-by-RSS items to history by updating list_position on ended.

#### Files Modified

- packages/orm/src/services/queue/queueResource.ts

## Session 17 - 2026-02-09

#### Prompt (Developer)

implement

#### Key Decisions

- Move download filename derivation into @podverse/helpers for reuse.
- Use selected source URL extension for download filenames across web flows.

#### Files Modified

- packages/helpers/src/lib/fileName.ts
- packages/helpers/src/index.ts
- apps/web/src/utils/downloadModal/downloadAddByRSSMediaWithModal.ts
- apps/web/src/utils/downloadModal/downloadEpisodeWithModal.ts
- apps/web/src/utils/downloadModal/downloadTrackWithModal.ts
- apps/web/src/components/SourceSelectors/SourceSelectors.tsx
