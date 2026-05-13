# Prompt 3 Result: API Auth + Account + Account Settings OpenAPI Draft

Scope:
- apps/api/src/routes/auth.ts
- apps/api/src/routes/account.ts
- apps/api/src/routes/accountSettings.ts

Goal:
- Provide operation-complete drafting guidance for auth/account/account-settings.
- Standardize security/auth semantics and baseline error responses for Postman/Swagger-compatible OpenAPI.

## Security Model Draft

Use two security schemes already present in apps/api/openapi.yml:
- cookieAuth: session cookie
- bearerAuth: JWT bearer

Operation-level policy draft:
- Public auth bootstrap operations: omit security at operation level.
- Authenticated operations: set security as OR:
  - cookieAuth: []
  - bearerAuth: []
- 401 vs 403 semantics:
  - 401 Unauthorized: missing/expired/invalid auth credentials.
  - 403 Forbidden: authenticated but blocked by feature/policy constraints (example: requireEmailFlows mode gate).

## Standard Response Envelope Draft

For mutating/authenticated endpoints, include at minimum:
- 200 or 201 success (operation-specific payload)
- 400 invalid request payload/params
- 401 unauthorized (where auth required)
- 403 forbidden (feature/policy denial)
- 429 rate limited (where rateLimitEndpoint/rateLimitAuthEndpoint is used)
- 500 server error

## Auth Operations Draft Inventory

| method | path | operationId draft | security draft | key notes |
|---|---|---|---|---|
| POST | /auth/login | authLogin | public | rateLimitEndpoint (5/min in prod; 100/min test), session cookie issuance, optional token body behavior |
| POST | /auth/logout | authLogout | cookieAuth or bearerAuth | clear session/token semantics |
| POST | /auth/mobile/token | authIssueMobileToken | public/mixed (verify controller) | mobile token issue flow |
| POST | /auth/mobile/refresh | authRefreshMobileToken | bearerAuth (verify) | refresh lifecycle |
| POST | /auth/mobile/revoke | authRevokeMobileToken | bearerAuth (verify) | token revocation/idempotency |
| GET | /auth/me | authGetMe | cookieAuth or bearerAuth | current account profile |
| GET | /auth/check-session | authCheckSession | cookieAuth or bearerAuth | session validity probe |

## Account Operations Draft Inventory

| method | path | operationId draft | security draft | key notes |
|---|---|---|---|---|
| GET | /account/recent | accountListRecent | cookieAuth or bearerAuth (verify controller) | list ordering recent |
| GET | /account/top | accountListTop | cookieAuth or bearerAuth (verify controller) | list ordering top |
| GET | /account/subscribed/az | accountListSubscribedAz | cookieAuth or bearerAuth | subscribed sort A-Z |
| GET | /account/subscribed/recent | accountListSubscribedRecent | cookieAuth or bearerAuth | subscribed sort recent |
| GET | /account/subscribed/top | accountListSubscribedTop | cookieAuth or bearerAuth | subscribed sort top |
| POST | /account | accountCreate | public | signup, rateLimitEndpoint 3/10min |
| PUT | /account | accountUpdate | cookieAuth or bearerAuth | update own account |
| POST | /account/send-verification-email | accountSendVerificationEmail | cookieAuth or bearerAuth | requireEmailFlows, rateLimitEndpoint 4/10min |
| POST | /account/verify-email | accountVerifyEmail | public/mixed (verify token-only flow) | requireEmailFlows, rateLimitEndpoint 10/10min |
| POST | /account/send-change-email-address-email | accountSendChangeEmailAddressEmail | cookieAuth or bearerAuth | requireEmailFlows, rateLimitEndpoint 4/10min |
| POST | /account/verify-email-change | accountVerifyEmailChange | public/mixed (verify token-only flow) | requireEmailFlows, rateLimitEndpoint 10/10min |
| POST | /account/send-reset-password-email | accountSendResetPasswordEmail | public/mixed | requireEmailFlows, rateLimitEndpoint 4/10min |
| POST | /account/reset-password | accountResetPassword | public/mixed | requireEmailFlows, rateLimitEndpoint 4/10min |
| POST | /account/set-password | accountSetPassword | cookieAuth or bearerAuth (verify) | rateLimitEndpoint 4/10min |
| DELETE | /account/delete | accountDelete | cookieAuth or bearerAuth | account deletion destructive flow |
| GET | /account/download-data | accountDownloadData | cookieAuth or bearerAuth | rateLimitAuthEndpoint 3/day |
| POST | /account/fcm-device/create | accountFcmDeviceCreate | cookieAuth or bearerAuth | register push target |
| PUT | /account/fcm-device/update | accountFcmDeviceUpdate | cookieAuth or bearerAuth | mutable push target metadata |
| DELETE | /account/fcm-device/delete | accountFcmDeviceDelete | cookieAuth or bearerAuth | remove push target |
| GET | /account/fcm-device/all-for-account | accountFcmDeviceGetAllForAccount | cookieAuth or bearerAuth | list push targets |
| PUT | /account/fcm-device/update-locale | accountFcmDeviceUpdateLocale | cookieAuth or bearerAuth | locale update |
| POST | /account/webpush-device/create | accountWebpushDeviceCreate | cookieAuth or bearerAuth | register browser push target |
| PUT | /account/webpush-device/update | accountWebpushDeviceUpdate | cookieAuth or bearerAuth | update browser push target |
| DELETE | /account/webpush-device/delete | accountWebpushDeviceDelete | cookieAuth or bearerAuth | remove browser push target |
| GET | /account/webpush-device/all-for-account | accountWebpushDeviceGetAllForAccount | cookieAuth or bearerAuth | list browser push targets |
| PUT | /account/webpush-device/update-locale | accountWebpushDeviceUpdateLocale | cookieAuth or bearerAuth | locale update |
| POST | /account/up-device/create | accountUpDeviceCreate | cookieAuth or bearerAuth | register UP device |
| PUT | /account/up-device/update | accountUpDeviceUpdate | cookieAuth or bearerAuth | update UP device |
| DELETE | /account/up-device/delete | accountUpDeviceDelete | cookieAuth or bearerAuth | remove UP device |
| GET | /account/up-device/for-account | accountUpDeviceGetForAccount | cookieAuth or bearerAuth | get UP device(s) for account |
| PUT | /account/up-device/update-locale | accountUpDeviceUpdateLocale | cookieAuth or bearerAuth | locale update |
| DELETE | /account/up-device/delete-all | accountUpDeviceDeleteAll | cookieAuth or bearerAuth | bulk delete UP devices |
| POST | /account/follow/account | accountFollowAccount | cookieAuth or bearerAuth | follow relationship create |
| POST | /account/unfollow/account | accountUnfollowAccount | cookieAuth or bearerAuth | follow relationship delete |
| POST | /account/follow/add-by-rss-channel | accountFollowAddByRssChannel | cookieAuth or bearerAuth | link add-by-rss channel |
| GET | /account/follow/add-by-rss-channel/{account_id_text} | accountGetFollowedAddByRssChannels | cookieAuth or bearerAuth | path param account_id_text |
| POST | /account/unfollow/add-by-rss-channel | accountUnfollowAddByRssChannel | cookieAuth or bearerAuth | unlink add-by-rss channel |
| POST | /account/add-by-rss/chapters-transcript | accountAddByRssChaptersTranscript | cookieAuth or bearerAuth | rateLimitEndpoint 30/min |
| POST | /account/add-by-rss/parse | accountAddByRssParse | cookieAuth or bearerAuth | async parse enqueue |
| POST | /account/add-by-rss/parse/all | accountAddByRssParseAll | cookieAuth or bearerAuth | async bulk enqueue |
| GET | /account/add-by-rss/parse/status/{request_id} | accountAddByRssParseStatus | cookieAuth or bearerAuth | async status polling |
| POST | /account/follow/channel | accountFollowChannel | cookieAuth or bearerAuth | follow channel |
| POST | /account/unfollow/channel | accountUnfollowChannel | cookieAuth or bearerAuth | unfollow channel |
| POST | /account/follow/playlist | accountFollowPlaylist | cookieAuth or bearerAuth | follow playlist |
| POST | /account/unfollow/playlist | accountUnfollowPlaylist | cookieAuth or bearerAuth | unfollow playlist |
| GET | /account/notification/channel/{channel_id_text} | accountNotificationChannelGet | cookieAuth or bearerAuth | get notification channel pref |
| GET | /account/notification/channels | accountNotificationChannelList | cookieAuth or bearerAuth | list notification channel prefs |
| POST | /account/notification/channel | accountNotificationChannelCreate | cookieAuth or bearerAuth | create notification channel pref |
| DELETE | /account/notification/channel/{channel_id_text} | accountNotificationChannelDelete | cookieAuth or bearerAuth | delete notification channel pref |
| POST | /account/notification/channel/type | accountNotificationChannelTypeCreate | cookieAuth or bearerAuth | add notification type |
| DELETE | /account/notification/channel/{channel_id_text}/type/{type} | accountNotificationChannelTypeDelete | cookieAuth or bearerAuth | remove notification type |
| GET | /account/{id_text} | accountGetByIdText | public/mixed (verify) | profile lookup by id_text |

## Account Settings Operations Draft Inventory

| method | path | operationId draft | security draft | key notes |
|---|---|---|---|---|
| PATCH | /account-settings/locale | accountSettingsUpdateLocale | cookieAuth or bearerAuth | update locale preference |
| POST | /account-settings/notification-type | accountSettingsNotificationTypeCreate | cookieAuth or bearerAuth | create account-level notification type |
| DELETE | /account-settings/notification-type | accountSettingsNotificationTypeDelete | cookieAuth or bearerAuth | delete account-level notification type |

## Explicit 401/403 Draft Rules

Apply these on relevant operations:
- 401 for any operation requiring authenticated account identity when identity is absent/invalid.
- 403 for feature policy gates such as requireEmailFlows denied by signup mode.
- For /account/send-verification-email, /account/verify-email, /account/send-change-email-address-email, /account/verify-email-change, /account/send-reset-password-email, /account/reset-password:
  - Add documented 403 response body example:
    - message: Email verification flows are not available in the current mode

## Example Snippets To Reuse In OpenAPI

### 1) Authenticated operation security block

```yaml
security:
  - cookieAuth: []
  - bearerAuth: []
```

### 2) Shared error response refs pattern

```yaml
responses:
  '400':
    $ref: '#/components/responses/BadRequest'
  '401':
    $ref: '#/components/responses/Unauthorized'
  '403':
    $ref: '#/components/responses/Forbidden'
  '429':
    $ref: '#/components/responses/TooManyRequests'
  '500':
    $ref: '#/components/responses/InternalServerError'
```

### 3) Path parameter style

```yaml
parameters:
  - in: path
    name: id_text
    required: true
    schema:
      type: string
```

## Gaps To Resolve During Spec Implementation

- Verify exact auth requirement for endpoints that may allow token-only flows vs active session.
- Confirm controller-level request/response schemas and normalization shapes for each operation.
- Ensure operationId uniqueness across full spec when merged with other route-module docs.
- Add concrete requestBody/response examples for login/mobile-token/account mutation flows.
