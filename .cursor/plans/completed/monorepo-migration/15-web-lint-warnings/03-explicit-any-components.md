# Phase 3: Fix Explicit Any in Components

**Status:** Pending

## Overview

Fix 24 `@typescript-eslint/no-explicit-any` warnings in components/ files.

## Files to Modify

### 1. `src/components/Category/CategoriesList.tsx` (1 warning)
- Line 18:16

### 2. `src/components/Content/Podroll/ContentPodrollRows.tsx` (2 warnings)
- Line 36:33
- Line 36:62

### 3. `src/components/InfoWrapper/HowToStartInfo.tsx` (1 warning)
- Line 8:9

### 4. `src/components/List/ListChannelSettings.tsx` (3 warnings)
- Line 44:23
- Line 117:41
- Line 123:41

### 5. `src/components/List/Playlists/ListPlaylistResources.tsx` (1 warning)
- Line 44:40

### 6. `src/components/Media/Header/IconButton.tsx` (2 warnings)
- Line 40:21
- Line 41:27

### 7. `src/components/MediaPlayer/Buttons/TrackPreviousButton.tsx` (1 warning)
- Line 37:43

### 8. `src/components/MediaPlayer/Buttons/TrackPreviousButtonMobile.tsx` (1 warning)
- Line 37:43

### 9. `src/components/MediaPlayer/Controller/MediaPlayerControllerAV.tsx` (1 warning)
- Line 103:34

### 10. `src/components/MediaPlayer/Controller/MediaPlayerControllerLiveStreamAV.tsx` (2 warnings)
- Line 29:35
- Line 31:34

### 11. `src/components/MediaPlayer/Modal/MediaPlayerInfoModal.tsx` (1 warning)
- Line 18:4

### 12. `src/components/Modal/ModalAuthLogin.tsx` (1 warning)
- Line 40:19

### 13. `src/components/Playlist/PlaylistForm.tsx` (4 warnings)
- Line 17:28
- Line 20:36
- Line 29:14
- Line 30:10

### 14. `src/components/PodcastIndex/PodcastIndexFeedInfo.tsx` (1 warning)
- Line 85:23

### 15. `src/components/Settings/Panels/SettingsAccount/ModalChangeEmail.tsx` (1 warning)
- Line 83:19

### 16. `src/components/Settings/Panels/SettingsAccount/ModalDeleteAccount.tsx` (1 warning)
- Line 79:19

## Approach

- Identify the actual types being used from context
- Import types from `@podverse/helpers` where available
- Define local types when needed
