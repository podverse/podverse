# Prompt 5 Result: API User Media + Queue OpenAPI Draft

Scope route modules:
- playlist
- clip
- queue
- itemChapter
- itemSoundbite
- itemTranscript

Primary objective:
- Draft operation-complete OpenAPI docs for user-owned media and queue flows.
- Make ownership/authorization constraints explicit.
- Define mutation-focused error semantics.

## Ownership/Authz Draft Rules

- Public read endpoints:
  - clip public listing endpoints
  - itemChapter/itemSoundbite/itemTranscript reads
- Authenticated-only endpoints:
  - queue routes
  - private playlist routes
  - private clip routes and most clip mutations
- Ownership checks (document as 403):
  - modifying/deleting clip not owned by account
  - modifying/deleting playlist or playlist resources not owned by account
  - queue updates against queue not owned by account

Security block for authenticated operations:
```yaml
security:
  - cookieAuth: []
  - bearerAuth: []
```

## Operation Inventory

| method | path | operationId draft | security draft | ownership note |
|---|---|---|---|---|
| GET | /clip/public/recent | clipListPublicRecent | public | none |
| GET | /clip/public/oldest | clipListPublicOldest | public | none |
| GET | /clip/public/top | clipListPublicTop | public | none |
| GET | /clip/public/category/recent | clipListPublicByCategoryRecent | public | none |
| GET | /clip/public/category/oldest | clipListPublicByCategoryOldest | public | none |
| GET | /clip/public/category/top | clipListPublicByCategoryTop | public | none |
| GET | /clip/public/channel/recent/{channel_id_text} | clipListPublicByChannelRecent | public | none |
| GET | /clip/public/channel/oldest/{channel_id_text} | clipListPublicByChannelOldest | public | none |
| GET | /clip/public/channel/top/{channel_id_text} | clipListPublicByChannelTop | public | none |
| GET | /clip/public/item/recent/{item_id_text} | clipListPublicByItemRecent | public | none |
| GET | /clip/public/item/oldest/{item_id_text} | clipListPublicByItemOldest | public | none |
| GET | /clip/public/item/top/{item_id_text} | clipListPublicByItemTop | public | none |
| GET | /clip/public/subscribed/recent | clipListPublicSubscribedRecent | public | none |
| GET | /clip/public/subscribed/top | clipListPublicSubscribedTop | public | none |
| GET | /clip/private | clipListPrivate | cookieAuth or bearerAuth | returns only caller-visible/private set |
| POST | /clip | clipCreate | cookieAuth or bearerAuth | owner = authenticated account |
| GET | /clip/{clip_id_text} | clipGetByIdText | public/mixed (verify) | access policy may redact private clip |
| PATCH | /clip/{clip_id_text} | clipUpdate | cookieAuth or bearerAuth | 403 when not owner |
| DELETE | /clip/{clip_id_text} | clipDelete | cookieAuth or bearerAuth | 403 when not owner |
| GET | /item-chapter/{item_chapter_id_text} | itemChapterGetByIdText | public | read-only |
| GET | /item-soundbite/channel/{channel_id_text} | itemSoundbiteListByChannel | public | read-only |
| GET | /item-soundbite/item/{item_id_text} | itemSoundbiteListByItem | public | read-only |
| GET | /item-soundbite/{item_soundbite_id_text} | itemSoundbiteGetByIdText | public | read-only |
| GET | /item-transcript/{item_id_text} | itemTranscriptGetByItemIdText | public | read-only |
| GET | /queue/all-for-account/private | queueListPrivateForAccount | cookieAuth or bearerAuth | current account only |
| GET | /queue/resources/all-by-account-abridged | queueListResourcesAbridged | cookieAuth or bearerAuth | current account only |
| GET | /queue/{queue_id_text}/resources/now-playing | queueGetNowPlaying | cookieAuth or bearerAuth | queue must be account-owned |
| GET | /queue/{queue_id_text}/resources/upcoming-all | queueListUpcomingAll | cookieAuth or bearerAuth | queue must be account-owned |
| GET | /queue/{queue_id_text}/resources/history-paginated | queueListHistoryPaginated | cookieAuth or bearerAuth | queue must be account-owned |
| POST | /queue/{queue_id_text}/update-is-active | queueUpdateIsActive | cookieAuth or bearerAuth | queue must be account-owned |
| GET | /playlist/private/likes | playlistPrivateLikes | cookieAuth or bearerAuth | account scoped |
| POST | /playlist/private/likes/membership | playlistPrivateLikesMembership | cookieAuth or bearerAuth | account scoped |
| POST | /playlist/private/likes/toggle | playlistPrivateLikesToggle | cookieAuth or bearerAuth | account scoped |
| GET | /playlist/private/top | playlistPrivateTop | cookieAuth or bearerAuth | account scoped |
| GET | /playlist/private/recent | playlistPrivateRecent | cookieAuth or bearerAuth | account scoped |
| GET | /playlist/private/oldest | playlistPrivateOldest | cookieAuth or bearerAuth | account scoped |
| GET | /playlist/private/az | playlistPrivateAz | cookieAuth or bearerAuth | account scoped |
| GET | /playlist/private/followed/top | playlistPrivateFollowedTop | cookieAuth or bearerAuth | account scoped |
| GET | /playlist/private/followed/recent | playlistPrivateFollowedRecent | cookieAuth or bearerAuth | account scoped |
| GET | /playlist/private/followed/oldest | playlistPrivateFollowedOldest | cookieAuth or bearerAuth | account scoped |
| GET | /playlist/private/followed/az | playlistPrivateFollowedAz | cookieAuth or bearerAuth | account scoped |
| GET | /playlist/public/top | playlistPublicTop | public | public discovery |
| POST | /playlist | playlistCreate | cookieAuth or bearerAuth | owner = authenticated account |
| GET | /playlist/{playlist_id_text}/resources/private-all | playlistResourcesPrivateAll | cookieAuth or bearerAuth (verify) | owner/follower policy applies |
| GET | /playlist/{playlist_id_text}/resources/queue-by-list-position | playlistResourcesQueueByListPosition | public/mixed (verify) | visibility policy applies |
| GET | /playlist/{playlist_id_text}/resources/shuffle | playlistResourcesShuffle | public/mixed (verify) | visibility policy applies |
| GET | /playlist/{playlist_id_text}/resources | playlistResourcesList | public/mixed (verify) | visibility policy applies |
| GET | /playlist/{playlist_id_text} | playlistGetByIdText | public/mixed (verify) | visibility policy applies |
| PATCH | /playlist/{playlist_id_text} | playlistUpdate | cookieAuth or bearerAuth | 403 when not owner |
| DELETE | /playlist/{playlist_id_text} | playlistDelete | cookieAuth or bearerAuth | 403 when not owner |
| POST | /playlist/{playlist_id_text}/clip/{clip_id_text}/first | playlistAddClipFirst | cookieAuth or bearerAuth | playlist owner required |
| POST | /playlist/{playlist_id_text}/clip/{clip_id_text}/between | playlistAddClipBetween | cookieAuth or bearerAuth | playlist owner required |
| POST | /playlist/{playlist_id_text}/clip/{clip_id_text}/last | playlistAddClipLast | cookieAuth or bearerAuth | playlist owner required |
| DELETE | /playlist/{playlist_id_text}/clip/{clip_id_text} | playlistRemoveClip | cookieAuth or bearerAuth | playlist owner required |
| POST | /playlist/{playlist_id_text}/item/{item_id_text}/first | playlistAddItemFirst | cookieAuth or bearerAuth | playlist owner required |
| POST | /playlist/{playlist_id_text}/item/{item_id_text}/between | playlistAddItemBetween | cookieAuth or bearerAuth | playlist owner required |
| POST | /playlist/{playlist_id_text}/item/{item_id_text}/last | playlistAddItemLast | cookieAuth or bearerAuth | playlist owner required |
| DELETE | /playlist/{playlist_id_text}/item/{item_id_text} | playlistRemoveItem | cookieAuth or bearerAuth | playlist owner required |
| POST | /playlist/{playlist_id_text}/item-add-by-rss/first | playlistAddItemAddByRssFirst | cookieAuth or bearerAuth | playlist owner required |
| POST | /playlist/{playlist_id_text}/item-add-by-rss/between | playlistAddItemAddByRssBetween | cookieAuth or bearerAuth | playlist owner required |
| POST | /playlist/{playlist_id_text}/item-add-by-rss/last | playlistAddItemAddByRssLast | cookieAuth or bearerAuth | playlist owner required |
| DELETE | /playlist/{playlist_id_text}/item-add-by-rss/{add_by_rss_hash_id} | playlistRemoveItemAddByRss | cookieAuth or bearerAuth | playlist owner required |
| POST | /playlist/{playlist_id_text}/item-soundbite/{soundbite_id_text}/first | playlistAddItemSoundbiteFirst | cookieAuth or bearerAuth | playlist owner required |
| POST | /playlist/{playlist_id_text}/item-soundbite/{soundbite_id_text}/between | playlistAddItemSoundbiteBetween | cookieAuth or bearerAuth | playlist owner required |
| POST | /playlist/{playlist_id_text}/item-soundbite/{soundbite_id_text}/last | playlistAddItemSoundbiteLast | cookieAuth or bearerAuth | playlist owner required |
| DELETE | /playlist/{playlist_id_text}/item-soundbite/{soundbite_id_text} | playlistRemoveItemSoundbite | cookieAuth or bearerAuth | playlist owner required |

## Mutation Error Cases Draft

For clip, queue mutations, and playlist mutations, include:
- 400 invalid payload/ordering constraints/path coercion
- 401 missing or invalid auth
- 403 authenticated but not owner/insufficient rights
- 404 target entity not found
- 409 conflict for list-position/resource state conflicts (if controller uses conflict semantics)
- 422 semantic validation errors (if returned by controller)
- 500 server error

## Request/Response Schema Draft Families

Recommended components:
- ClipCreateRequest, ClipUpdateRequest, ClipResponse
- QueueUpdateIsActiveRequest, QueueResourceListResponse
- PlaylistCreateRequest, PlaylistUpdateRequest, PlaylistResponse
- PlaylistMutationResult (add/remove resource operations)
- ItemChapterResponse, ItemSoundbiteResponse, ItemTranscriptResponse

## Example Coverage Checklist

Add explicit examples for:
- creating clip with start/end offsets
- unauthorized clip update (401)
- forbidden playlist update by non-owner (403)
- queue now-playing read success
- playlist resource insertion at first/between/last positions
