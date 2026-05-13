# Prompt 1 Result: API Route Matrix

- Source: `apps/api/src/routes` (including `product/`)
- Module count: 25
- Operation rows: 209
- Unresolved operation rows: 0

Notes:
- Canonical paths include mount prefixes from route modules.
- Some operations are multiline/non-literal and are marked as UNRESOLVED for manual extraction during OpenAPI drafting.

## apps/api/src/routes/account.ts

| method | canonical path | auth requirement | request schema source | response schema source | risk class | notes |
|---|---|---|---|---|---|---|
| GET | /account/recent | authenticated (likely) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /account/top | authenticated (likely) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /account/subscribed/az | authenticated (likely) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /account/subscribed/recent | authenticated (likely) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /account/subscribed/top | authenticated (likely) | none or query parsing | controller JSON/DTO inferred | low |  |
| POST | /account | unknown (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| PUT | /account | unknown (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /account/send-verification-email | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /account/verify-email | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /account/send-change-email-address-email | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /account/verify-email-change | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /account/send-reset-password-email | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /account/reset-password | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /account/set-password | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| DELETE | /account/delete | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | high |  |
| GET | /account/download-data | authenticated (likely) | none or query parsing | controller JSON/DTO inferred | low |  |
| POST | /account/fcm-device/create | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| PUT | /account/fcm-device/update | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| DELETE | /account/fcm-device/delete | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | high |  |
| GET | /account/fcm-device/all-for-account | authenticated (likely) | none or query parsing | controller JSON/DTO inferred | low |  |
| PUT | /account/fcm-device/update-locale | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /account/webpush-device/create | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| PUT | /account/webpush-device/update | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| DELETE | /account/webpush-device/delete | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | high |  |
| GET | /account/webpush-device/all-for-account | authenticated (likely) | none or query parsing | controller JSON/DTO inferred | low |  |
| PUT | /account/webpush-device/update-locale | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /account/up-device/create | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| PUT | /account/up-device/update | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| DELETE | /account/up-device/delete | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | high |  |
| GET | /account/up-device/for-account | authenticated (likely) | none or query parsing | controller JSON/DTO inferred | low |  |
| PUT | /account/up-device/update-locale | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| DELETE | /account/up-device/delete-all | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | high |  |
| POST | /account/follow/account | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /account/unfollow/account | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /account/follow/add-by-rss-channel | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| GET | /account/follow/add-by-rss-channel/:account_id_text | authenticated (likely) | none or query parsing | controller JSON/DTO inferred | low |  |
| POST | /account/unfollow/add-by-rss-channel | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /account/add-by-rss/chapters-transcript | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /account/add-by-rss/parse | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /account/add-by-rss/parse/all | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| GET | /account/add-by-rss/parse/status/:request_id | authenticated (likely) | none or query parsing | controller JSON/DTO inferred | low |  |
| POST | /account/follow/channel | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /account/unfollow/channel | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /account/follow/playlist | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /account/unfollow/playlist | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| GET | /account/notification/channel/:channel_id_text | authenticated (likely) | none or query parsing | controller JSON/DTO inferred | high |  |
| GET | /account/notification/channels | authenticated (likely) | none or query parsing | controller JSON/DTO inferred | high |  |
| POST | /account/notification/channel | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | high |  |
| DELETE | /account/notification/channel/:channel_id_text | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | high |  |
| POST | /account/notification/channel/type | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | high |  |
| DELETE | /account/notification/channel/:channel_id_text/type/:type | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | high |  |
| GET | /account/:id_text | authenticated (likely) | none or query parsing | controller JSON/DTO inferred | low |  |

## apps/api/src/routes/accountSettings.ts

| method | canonical path | auth requirement | request schema source | response schema source | risk class | notes |
|---|---|---|---|---|---|---|
| PATCH | /account-settings/locale | unknown (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /account-settings/notification-type | unknown (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | high |  |
| DELETE | /account-settings/notification-type | unknown (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | high |  |

## apps/api/src/routes/auth.ts

| method | canonical path | auth requirement | request schema source | response schema source | risk class | notes |
|---|---|---|---|---|---|---|
| POST | /auth/login | public or mixed (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | high |  |
| POST | /auth/logout | unknown (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | high |  |
| POST | /auth/mobile/token | public or mixed (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | high |  |
| POST | /auth/mobile/refresh | public or mixed (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | high |  |
| POST | /auth/mobile/revoke | public or mixed (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | high |  |
| GET | /auth/me | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | high |  |
| GET | /auth/check-session | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | high |  |

## apps/api/src/routes/category.ts

| method | canonical path | auth requirement | request schema source | response schema source | risk class | notes |
|---|---|---|---|---|---|---|
| GET | /category/:id | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /category | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |

## apps/api/src/routes/channel.ts

| method | canonical path | auth requirement | request schema source | response schema source | risk class | notes |
|---|---|---|---|---|---|---|
| GET | /channel/podcast-index/:podcast_index_id | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /channel/global/recent | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /channel/global/top | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /channel/category/recent | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /channel/category/top | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /channel/subscribed/az | authenticated (likely) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /channel/subscribed/recent | authenticated (likely) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /channel/subscribed/top | authenticated (likely) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /channel/:idOrIdText | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |

## apps/api/src/routes/clip.ts

| method | canonical path | auth requirement | request schema source | response schema source | risk class | notes |
|---|---|---|---|---|---|---|
| GET | /clip/public/recent | public | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /clip/public/oldest | public | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /clip/public/top | public | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /clip/public/category/recent | public | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /clip/public/category/oldest | public | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /clip/public/category/top | public | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /clip/public/channel/recent/:channel_id_text | public | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /clip/public/channel/oldest/:channel_id_text | public | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /clip/public/channel/top/:channel_id_text | public | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /clip/public/item/recent/:item_id_text | public | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /clip/public/item/oldest/:item_id_text | public | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /clip/public/item/top/:item_id_text | public | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /clip/public/subscribed/recent | public | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /clip/public/subscribed/top | public | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /clip/private | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |
| POST | /clip | unknown (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| GET | /clip/:clip_id_text | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |
| PATCH | /clip/:clip_id_text | unknown (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| DELETE | /clip/:clip_id_text | unknown (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | high |  |

## apps/api/src/routes/externalServices.ts

| method | canonical path | auth requirement | request schema source | response schema source | risk class | notes |
|---|---|---|---|---|---|---|
| GET | /external-services/podcast-index/feed/:podcast_index_id | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /external-services/podcast-index/search/podcasts | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |

## apps/api/src/routes/feed.ts

| method | canonical path | auth requirement | request schema source | response schema source | risk class | notes |
|---|---|---|---|---|---|---|
| GET | /feed/:podcast_index_id | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |

## apps/api/src/routes/item.ts

| method | canonical path | auth requirement | request schema source | response schema source | risk class | notes |
|---|---|---|---|---|---|---|
| GET | /item/chapters/:item_id_text | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /item/channel/season/forward/:channelIdOrIdText | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /item/channel/season/backward/:channelIdOrIdText | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /item/channel/recent/:channelIdOrIdText | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /item/channel/oldest/:channelIdOrIdText | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /item/channel/top/:channelIdOrIdText | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /item/channel/shuffle/:channelIdOrIdText | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /item/queue/pub-date/:idText | authenticated (likely) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /item/queue/season/:idText | authenticated (likely) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /item/global/recent | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /item/global/top | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /item/category/recent | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /item/category/top | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /item/subscribed/recent | authenticated (likely) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /item/subscribed/top | authenticated (likely) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /item/:idOrIdText | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |

## apps/api/src/routes/itemChapter.ts

| method | canonical path | auth requirement | request schema source | response schema source | risk class | notes |
|---|---|---|---|---|---|---|
| GET | /item-chapter/:item_chapter_id_text | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |

## apps/api/src/routes/itemSoundbite.ts

| method | canonical path | auth requirement | request schema source | response schema source | risk class | notes |
|---|---|---|---|---|---|---|
| GET | /item-soundbite/channel/:channel_id_text | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /item-soundbite/item/:item_id_text | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /item-soundbite/:item_soundbite_id_text | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |

## apps/api/src/routes/itemTranscript.ts

| method | canonical path | auth requirement | request schema source | response schema source | risk class | notes |
|---|---|---|---|---|---|---|
| GET | /item-transcript/:item_id_text | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |

## apps/api/src/routes/liveItem.ts

| method | canonical path | auth requirement | request schema source | response schema source | risk class | notes |
|---|---|---|---|---|---|---|
| GET | /live-item/global/recent | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /live-item/global/top | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /live-item/category/recent | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /live-item/category/top | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /live-item/subscribed/recent | authenticated (likely) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /live-item/subscribed/top | authenticated (likely) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /live-item/channel/:channelIdOrIdText | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |

## apps/api/src/routes/medium.ts

| method | canonical path | auth requirement | request schema source | response schema source | risk class | notes |
|---|---|---|---|---|---|---|
| GET | /medium-value | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |

## apps/api/src/routes/membershipClaimToken.ts

| method | canonical path | auth requirement | request schema source | response schema source | risk class | notes |
|---|---|---|---|---|---|---|
| POST | /membership-claim-token/claim/:token | unknown (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | high |  |

## apps/api/src/routes/metaboost.ts

| method | canonical path | auth requirement | request schema source | response schema source | risk class | notes |
|---|---|---|---|---|---|---|
| GET | /metaboost/mbrss-v1/mint-app-assertion/rate-limit-status | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |
| POST | /metaboost/mbrss-v1/mint-app-assertion | unknown (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |

## apps/api/src/routes/mq.ts

| method | canonical path | auth requirement | request schema source | response schema source | risk class | notes |
|---|---|---|---|---|---|---|
| POST | /mq/rss/add/on-demand | unknown (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | high |  |
| POST | /mq/rss/refresh/on-demand | unknown (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | high |  |

## apps/api/src/routes/paypal.ts

| method | canonical path | auth requirement | request schema source | response schema source | risk class | notes |
|---|---|---|---|---|---|---|
| GET | /paypal/:payment_id | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | high |  |
| POST | /paypal/create | unknown (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | high |  |
| POST | /paypal/webhooks/payment-completed | unknown (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | high |  |

## apps/api/src/routes/playlist.ts

| method | canonical path | auth requirement | request schema source | response schema source | risk class | notes |
|---|---|---|---|---|---|---|
| GET | /playlist/private/likes | authenticated (likely) | none or query parsing | controller JSON/DTO inferred | low |  |
| POST | /playlist/private/likes/membership | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | high |  |
| POST | /playlist/private/likes/toggle | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| GET | /playlist/private/top | authenticated (likely) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /playlist/private/recent | authenticated (likely) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /playlist/private/oldest | authenticated (likely) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /playlist/private/az | authenticated (likely) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /playlist/private/followed/top | authenticated (likely) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /playlist/private/followed/recent | authenticated (likely) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /playlist/private/followed/oldest | authenticated (likely) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /playlist/private/followed/az | authenticated (likely) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /playlist/public/top | public | none or query parsing | controller JSON/DTO inferred | low |  |
| POST | /playlist | unknown (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| GET | /playlist/:playlist_id_text/resources/private-all | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /playlist/:playlist_id_text/resources/queue-by-list-position | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /playlist/:playlist_id_text/resources/shuffle | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /playlist/:playlist_id_text/resources | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /playlist/:playlist_id_text | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |
| PATCH | /playlist/:playlist_id_text | unknown (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| DELETE | /playlist/:playlist_id_text | unknown (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | high |  |
| POST | /playlist/:playlist_id_text/clip/:clip_id_text/first | unknown (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /playlist/:playlist_id_text/clip/:clip_id_text/between | unknown (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /playlist/:playlist_id_text/clip/:clip_id_text/last | unknown (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| DELETE | /playlist/:playlist_id_text/clip/:clip_id_text | unknown (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | high |  |
| POST | /playlist/:playlist_id_text/item/:item_id_text/first | unknown (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /playlist/:playlist_id_text/item/:item_id_text/between | unknown (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /playlist/:playlist_id_text/item/:item_id_text/last | unknown (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| DELETE | /playlist/:playlist_id_text/item/:item_id_text | unknown (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | high |  |
| POST | /playlist/:playlist_id_text/item-add-by-rss/first | unknown (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /playlist/:playlist_id_text/item-add-by-rss/between | unknown (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /playlist/:playlist_id_text/item-add-by-rss/last | unknown (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| DELETE | /playlist/:playlist_id_text/item-add-by-rss/:add_by_rss_hash_id | unknown (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | high |  |
| POST | /playlist/:playlist_id_text/item-soundbite/:soundbite_id_text/first | unknown (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /playlist/:playlist_id_text/item-soundbite/:soundbite_id_text/between | unknown (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /playlist/:playlist_id_text/item-soundbite/:soundbite_id_text/last | unknown (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| DELETE | /playlist/:playlist_id_text/item-soundbite/:soundbite_id_text | unknown (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | high |  |

## apps/api/src/routes/podroll.ts

| method | canonical path | auth requirement | request schema source | response schema source | risk class | notes |
|---|---|---|---|---|---|---|
| GET | /podroll/channel/:idOrIdText | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |

## apps/api/src/routes/product/membership.ts

| method | canonical path | auth requirement | request schema source | response schema source | risk class | notes |
|---|---|---|---|---|---|---|

## apps/api/src/routes/profileContent.ts

| method | canonical path | auth requirement | request schema source | response schema source | risk class | notes |
|---|---|---|---|---|---|---|
| GET | /profile/:account_id_text/podcasts/az | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /profile/:account_id_text/albums/az | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /profile/:account_id_text/playlists/az | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /profile/:account_id_text/clips/recent | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |

## apps/api/src/routes/publisherFeed.ts

| method | canonical path | auth requirement | request schema source | response schema source | risk class | notes |
|---|---|---|---|---|---|---|
| GET | /publisher-feed/channel/:idOrIdText | unknown (verify controller) | none or query parsing | controller JSON/DTO inferred | low |  |

## apps/api/src/routes/queue.ts

| method | canonical path | auth requirement | request schema source | response schema source | risk class | notes |
|---|---|---|---|---|---|---|
| GET | /queue/all-for-account/private | authenticated (likely) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /queue/resources/all-by-account-abridged | authenticated (likely) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /queue/:queue_id_text/resources/now-playing | authenticated (likely) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /queue/:queue_id_text/resources/upcoming-all | authenticated (likely) | none or query parsing | controller JSON/DTO inferred | low |  |
| GET | /queue/:queue_id_text/resources/history-paginated | authenticated (likely) | none or query parsing | controller JSON/DTO inferred | low |  |
| POST | /queue/:queue_id_text/update-is-active | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /queue/:queue_id_text/clip/:clip_id_text/now-playing | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /queue/:queue_id_text/clip/:clip_id_text/next | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /queue/:queue_id_text/clip/:clip_id_text/last | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /queue/:queue_id_text/clip/:clip_id_text/between | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /queue/:queue_id_text/clip/:clip_id_text/history | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| DELETE | /queue/:queue_id_text/clip/:clip_id_text | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | high |  |
| POST | /queue/:queue_id_text/item/:item_id_text/now-playing | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /queue/:queue_id_text/item/:item_id_text/next | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /queue/:queue_id_text/item/:item_id_text/last | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /queue/:queue_id_text/item/:item_id_text/between | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /queue/:queue_id_text/item/:item_id_text/history | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| DELETE | /queue/:queue_id_text/item/:item_id_text | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | high |  |
| POST | /queue/:queue_id_text/item-add-by-rss/now-playing | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /queue/:queue_id_text/item-add-by-rss/next | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /queue/:queue_id_text/item-add-by-rss/last | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /queue/:queue_id_text/item-add-by-rss/between | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /queue/:queue_id_text/item-add-by-rss/history | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| DELETE | /queue/:queue_id_text/item-add-by-rss/:add_by_rss_hash_id | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | high |  |
| POST | /queue/:queue_id_text/item-soundbite/:item_soundbite_id_text/now-playing | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /queue/:queue_id_text/item-soundbite/:item_soundbite_id_text/next | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /queue/:queue_id_text/item-soundbite/:item_soundbite_id_text/last | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /queue/:queue_id_text/item-soundbite/:item_soundbite_id_text/between | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /queue/:queue_id_text/item-soundbite/:item_soundbite_id_text/history | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| DELETE | /queue/:queue_id_text/item-soundbite/:item_soundbite_id_text | authenticated (likely) | controller-level validation (likely) | controller JSON/DTO inferred | high |  |

## apps/api/src/routes/stats.ts

| method | canonical path | auth requirement | request schema source | response schema source | risk class | notes |
|---|---|---|---|---|---|---|
| POST | /stats/account | unknown (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /stats/channel | unknown (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /stats/clip | unknown (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /stats/item | unknown (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |
| POST | /stats/playlist | unknown (verify controller) | controller-level validation (likely) | controller JSON/DTO inferred | medium |  |

