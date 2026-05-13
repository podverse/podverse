# Prompt 4 Result: API Content + Discovery OpenAPI Draft

Scope route modules:
- category
- channel
- feed
- item
- live-item
- medium
- profile-content
- publisher-feed
- podroll

Primary objective:
- Draft operation-complete OpenAPI coverage for content/discovery reads.
- Normalize pagination/filter/sort parameter language across list endpoints.

## Parameter Normalization Draft

Recommended reusable query parameters for list/search style GET operations:
- page: integer >= 1
- pageSize: integer, bounded max (document module-specific default/max)
- sort: enum [recent, top, oldest, az, shuffle] where applicable
- categoryId or categorySlug: optional category filter
- idOrIdText style params: document accepted formats and fallback precedence

Path parameter naming draft:
- Use semantic parameter names exactly as route intent:
  - podcast_index_id
  - channelIdOrIdText
  - idOrIdText
  - item_id_text
  - account_id_text

Response normalization draft:
- List endpoints: object envelope with items plus paging meta.
- Detail endpoints: single resource payload.
- Return 400 for invalid path/query coercion, 404 for missing resources, 500 for server failure.

## Operation Inventory

| method | path | operationId draft | security draft | list/detail class |
|---|---|---|---|---|
| GET | /category | categoryList | public | list |
| GET | /category/{id} | categoryGetById | public | detail |
| GET | /channel/podcast-index/{podcast_index_id} | channelGetByPodcastIndexId | public | detail |
| GET | /channel/global/recent | channelListGlobalRecent | public | list |
| GET | /channel/global/top | channelListGlobalTop | public | list |
| GET | /channel/category/recent | channelListByCategoryRecent | public | list |
| GET | /channel/category/top | channelListByCategoryTop | public | list |
| GET | /channel/subscribed/az | channelListSubscribedAz | cookieAuth or bearerAuth | list |
| GET | /channel/subscribed/recent | channelListSubscribedRecent | cookieAuth or bearerAuth | list |
| GET | /channel/subscribed/top | channelListSubscribedTop | cookieAuth or bearerAuth | list |
| GET | /channel/{idOrIdText} | channelGetByIdOrIdText | public/mixed (verify) | detail |
| GET | /feed/{podcast_index_id} | feedGetByPodcastIndexId | public | detail |
| GET | /item/chapters/{item_id_text} | itemGetChapters | public | detail |
| GET | /item/channel/season/forward/{channelIdOrIdText} | itemListByChannelSeasonForward | public | list |
| GET | /item/channel/season/backward/{channelIdOrIdText} | itemListByChannelSeasonBackward | public | list |
| GET | /item/channel/recent/{channelIdOrIdText} | itemListByChannelRecent | public | list |
| GET | /item/channel/oldest/{channelIdOrIdText} | itemListByChannelOldest | public | list |
| GET | /item/channel/top/{channelIdOrIdText} | itemListByChannelTop | public | list |
| GET | /item/channel/shuffle/{channelIdOrIdText} | itemListByChannelShuffle | public | list |
| GET | /item/queue/pub-date/{idText} | itemQueuePubDate | cookieAuth or bearerAuth | list |
| GET | /item/queue/season/{idText} | itemQueueSeason | cookieAuth or bearerAuth | list |
| GET | /item/global/recent | itemListGlobalRecent | public | list |
| GET | /item/global/top | itemListGlobalTop | public | list |
| GET | /item/category/recent | itemListByCategoryRecent | public | list |
| GET | /item/category/top | itemListByCategoryTop | public | list |
| GET | /item/subscribed/recent | itemListSubscribedRecent | cookieAuth or bearerAuth | list |
| GET | /item/subscribed/top | itemListSubscribedTop | cookieAuth or bearerAuth | list |
| GET | /item/{idOrIdText} | itemGetByIdOrIdText | public | detail |
| GET | /live-item/global/recent | liveItemListGlobalRecent | public | list |
| GET | /live-item/global/top | liveItemListGlobalTop | public | list |
| GET | /live-item/category/recent | liveItemListByCategoryRecent | public | list |
| GET | /live-item/category/top | liveItemListByCategoryTop | public | list |
| GET | /live-item/subscribed/recent | liveItemListSubscribedRecent | cookieAuth or bearerAuth | list |
| GET | /live-item/subscribed/top | liveItemListSubscribedTop | cookieAuth or bearerAuth | list |
| GET | /live-item/channel/{channelIdOrIdText} | liveItemListByChannel | public | list |
| GET | /medium-value | mediumValueList | public | list/detail (verify shape) |
| GET | /profile/{account_id_text}/podcasts/az | profileContentPodcastsAz | public | list |
| GET | /profile/{account_id_text}/albums/az | profileContentAlbumsAz | public | list |
| GET | /profile/{account_id_text}/playlists/az | profileContentPlaylistsAz | public | list |
| GET | /profile/{account_id_text}/clips/recent | profileContentClipsRecent | public | list |
| GET | /publisher-feed/channel/{idOrIdText} | publisherFeedByChannel | public | list |
| GET | /podroll/channel/{idOrIdText} | podrollByChannel | public | list |

## Response Schema Draft Families

Use shared component families to reduce duplication:
- CategorySummary
- ChannelSummary
- FeedDetail
- ItemSummary and ItemDetail
- LiveItemSummary
- ProfileContentRow
- PublisherFeedRow
- PodrollRow
- PagingMeta

For each list operation, document:
- deterministic sort behavior
- accepted filter params and defaults
- whether empty lists are 200 with [] vs 404

## Error Semantics Draft

Apply default errors to all operations in scope:
- 400: malformed IDs, unsupported enum/sort values, bad pagination bounds
- 401: authenticated list variants (subscribed/queue) when no valid auth
- 404: resource key not found where endpoint is detail-oriented
- 500: internal failure

## Postman/Swagger Compatibility Notes

- Keep operationId unique and stable.
- Avoid oneOf/anyOf for simple filters when Postman import can flatten to broad object; prefer explicit schema objects.
- Provide concrete examples for query params on list endpoints.
- Represent colon-style params from source as OpenAPI {param} tokens in path keys.
