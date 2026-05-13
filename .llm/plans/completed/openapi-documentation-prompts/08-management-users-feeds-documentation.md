# Prompt 8 Result: Management Users + Feeds OpenAPI Draft

Scope route modules:
- users
- feeds

Objective:
- Draft operation-complete docs for management users/feeds.
- Emphasize pagination/query filters, policy-state transitions, and superuser restrictions.

## Authorization Draft

Users module:
- superuser-only operations (explicit requireSuperuser).

Feeds module:
- requireCrud('feeds','read') for read/search/options.
- requireCrud('feeds','update') for policy-state mutation.

Error semantics:
- 401: unauthenticated
- 403: authenticated but not superuser or lacking feeds permission

## Users Operations

| method | path | operationId draft | authz draft | notes |
|---|---|---|---|---|
| GET | /users | managementUsersList | superuser | paginated list; include query params docs |
| GET | /users/{id} | managementUsersGetById | superuser | account lookup by numeric id |
| POST | /users | managementUsersCreate | superuser | account creation |
| PATCH | /users/{id} | managementUsersUpdate | superuser | partial update |
| DELETE | /users/{id} | managementUsersDelete | superuser | destructive delete |
| POST | /users/{id}/password | managementUsersSetPassword | superuser | credential reset/set flow |
| GET | /users/{id}/invite-link | managementUsersInviteLinkGet | superuser | get invite link |
| POST | /users/{id}/invite-link | managementUsersInviteLinkCreate | superuser | create invite link |
| DELETE | /users/{id}/invite-link | managementUsersInviteLinkDelete | superuser | revoke invite link |

## Feeds Operations

| method | path | operationId draft | authz draft | notes |
|---|---|---|---|---|
| GET | /feeds/options | managementFeedsOptions | requireCrud('feeds','read') | discovery metadata for filters/options |
| GET | /feeds | managementFeedsList | requireCrud('feeds','read') | list with filtering and pagination |
| GET | /feeds/lookup | managementFeedsLookup | requireCrud('feeds','read') | lookup by identifiers/search terms |
| PATCH | /feeds/{id}/policy-state | managementFeedsPolicyStateUpdate | requireCrud('feeds','update') | policy-state transition mutation |

## Pagination and Filter Documentation Draft

For list/lookup endpoints, document:
- page and pageSize bounds
- sort and order semantics
- allowed filter keys and values
- behavior for zero results (200 with empty list)

For lookup endpoints, include examples for:
- exact id lookup
- fuzzy search lookup
- disallowed/invalid query combinations (400)

## Policy-State Transition Documentation Draft

For PATCH /feeds/{id}/policy-state:
- enumerate permitted target states
- list illegal transitions and resulting 400/409 behavior
- include audit note if transition writes are audited
- include 404 when feed id not found

## Shared Response Pattern Draft

- List responses should include items + pagination meta.
- Mutation responses should include updated entity snapshot.
- Always document 401, 403, 404, 500; add 409 when transition conflicts exist.
