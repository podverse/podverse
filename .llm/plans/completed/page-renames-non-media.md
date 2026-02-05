---
name: page-renames-non-media
overview: Rename non-media page-specific components to include "Page" in the name and update imports.
todos:
  - id: home-page-renames
    content: Rename home page components to Page naming
    status: pending
  - id: profile-page-renames
    content: Rename profile and my-profile page components to Page naming
    status: pending
  - id: lists-and-search-page-renames
    content: Rename list/search/history/queues page components to Page naming
    status: pending
  - id: clips-playlists-page-renames
    content: Rename clips and playlists page components to Page naming
    status: pending
  - id: auth-and-system-page-renames
    content: Rename auth/system page components to Page naming
    status: pending
isProject: false
---

# Non-Media Page Component Renames

## Goal

Ensure non-media page-specific component implementations include `Page` in their names.

## Steps

1. **Home**
   - `apps/web/src/app/home/HomeClient.tsx` → `HomePageClient.tsx`
   - `apps/web/src/app/home/HomeHeader.tsx` → `HomePageHeader.tsx`
   - `apps/web/src/app/home/HomeContext.tsx` → `HomePageContext.tsx`
   - `apps/web/src/app/home/HomeDropdownConfig.tsx` → `HomePageDropdownConfig.tsx`

2. **Profiles**
   - `/profile/[id_text]`:
     - `ProfileClient.tsx` → `ProfilePageClient.tsx`
     - `ProfileContentList.tsx` → `ProfilePageContentList.tsx`
     - `ProfileContentListHeader.tsx` → `ProfilePageContentListHeader.tsx`
     - `ProfileContentContext.tsx` → `ProfilePageContentContext.tsx`
   - `/my-profile`:
     - `MyProfileClient.tsx` → `MyProfilePageClient.tsx`
     - `MyProfileContentList.tsx` → `MyProfilePageContentList.tsx`
     - `MyProfileContentListHeader.tsx` → `MyProfilePageContentListHeader.tsx`
     - `MyProfileContentContext.tsx` → `MyProfilePageContentContext.tsx`
   - `/profiles`:
     - `ProfilesClient.tsx` → `ProfilesPageClient.tsx`
     - `ProfilesHeader.tsx` → `ProfilesPageHeader.tsx`
     - `ProfilesList.tsx` → `ProfilesPageList.tsx`
     - `ProfilesContext.tsx` → `ProfilesPageContext.tsx`
     - `ProfilesDropdownConfig.ts` → `ProfilesPageDropdownConfig.ts`

3. **History / Queues / Search / Lists**
   - `/history`:
     - `HistoryClient.tsx` → `HistoryPageClient.tsx`
     - `HistoryHeader.tsx` → `HistoryPageHeader.tsx`
     - `HistoryList.tsx` → `HistoryPageList.tsx`
     - `HistoryListHeader.tsx` → `HistoryPageListHeader.tsx`
   - `/queues`:
     - `QueuesClient.tsx` → `QueuesPageClient.tsx`
     - `QueuesHeader.tsx` → `QueuesPageHeader.tsx`
     - `QueuesList.tsx` → `QueuesPageList.tsx`
     - `QueuesListHeader.tsx` → `QueuesPageListHeader.tsx`
   - `/search`:
     - `SearchClient.tsx` → `SearchPageClient.tsx`
     - `SearchHeader.tsx` → `SearchPageHeader.tsx`
     - `SearchList.tsx` → `SearchPageList.tsx`
     - `SearchListHeader.tsx` → `SearchPageListHeader.tsx`

4. **Clips**
   - `/clips`:
     - `ClipsClient.tsx` → `ClipsPageClient.tsx`
     - `ClipsHeader.tsx` → `ClipsPageHeader.tsx`
     - `ClipsList.tsx` → `ClipsPageList.tsx`
     - `ClipsContext.tsx` → `ClipsPageContext.tsx`
   - `/clip/[clip_id]`:
     - `ClipClient.tsx` → `ClipPageClient.tsx`
   - `/clip/edit/[clip_id]`:
     - `ClipEditClient.tsx` → `ClipEditPageClient.tsx`
     - `ClipEditHeader.tsx` → `ClipEditPageHeader.tsx`
     - `ClipEditForm.tsx` → `ClipEditPageForm.tsx`
     - `ClipEditContext.tsx` → `ClipEditPageContext.tsx`

5. **Playlists**
   - `/playlists`:
     - `PlaylistsClient.tsx` → `PlaylistsPageClient.tsx`
     - `PlaylistsHeader.tsx` → `PlaylistsPageHeader.tsx`
     - `PlaylistsList.tsx` → `PlaylistsPageList.tsx`
     - `PlaylistsListHeader.tsx` → `PlaylistsPageListHeader.tsx`
     - `PlaylistsContext.tsx` → `PlaylistsPageContext.tsx`
     - `PlaylistsDropdownConfig.ts` → `PlaylistsPageDropdownConfig.ts`
   - `/playlist/[playlist_id]`:
     - `PlaylistClient.tsx` → `PlaylistPageClient.tsx`
     - `PlaylistHeader.tsx` → `PlaylistPageHeader.tsx`
     - `PlaylistHeaderInfo.tsx` → `PlaylistPageHeaderInfo.tsx`
     - `PlaylistList.tsx` → `PlaylistPageList.tsx`
     - `PlaylistContext.tsx` → `PlaylistPageContext.tsx`
   - `/playlist/create`:
     - `PlaylistCreateClient.tsx` → `PlaylistCreatePageClient.tsx`
     - `PlaylistCreateHeader.tsx` → `PlaylistCreatePageHeader.tsx`
     - `PlaylistCreateForm.tsx` → `PlaylistCreatePageForm.tsx`
     - `PlaylistCreateContext.tsx` → `PlaylistCreatePageContext.tsx`
   - `/playlist/edit/[playlist_id]`:
     - `PlaylistEditClient.tsx` → `PlaylistEditPageClient.tsx`
     - `PlaylistEditHeader.tsx` → `PlaylistEditPageHeader.tsx`
     - `PlaylistEditForm.tsx` → `PlaylistEditPageForm.tsx`
     - `PlaylistEditList.tsx` → `PlaylistEditPageList.tsx`
     - `PlaylistEditButtonTabs.tsx` → `PlaylistEditPageButtonTabs.tsx`
     - `PlaylistEditContext.tsx` → `PlaylistEditPageContext.tsx`

6. **Updates / Checkout / Auth / System**
   - `/updates`:
     - `UpdatesClient.tsx` → `UpdatesPageClient.tsx`
   - `/checkout`:
     - `CheckoutClient.tsx` → `CheckoutPageClient.tsx`
   - `/email-change`:
     - `EmailChangeClient.tsx` → `EmailChangePageClient.tsx`
   - `/email-change-verifying`:
     - `EmailChangeVerifyingClient.tsx` → `EmailChangeVerifyingPageClient.tsx`
   - `/forgot-password`:
     - `ForgotPasswordClient.tsx` → `ForgotPasswordPageClient.tsx`
   - `/reset-password`:
     - `ResetPasswordClient.tsx` → `ResetPasswordPageClient.tsx`
   - `/verify-email`:
     - `VerifyEmailClient.tsx` → `VerifyEmailPageClient.tsx`
   - `/test-error-boundaries`:
     - `TestErrorBoundariesClient.tsx` → `TestErrorBoundariesPageClient.tsx`

7. **Routes with only `page.tsx`**
   - No changes required for: `/about`, `/donate`, `/terms`, `/my-clips`, `/videos`.

## Expected Files

- Renamed `*Page*` files listed above
- Updated imports in each affected route folder
