# Prompt 7 Result: Management Auth + Admins OpenAPI Draft

Scope route modules:
- auth
- admins

Objective:
- Draft operation-complete management auth/admin docs.
- Make role/permission semantics explicit, including expected 401 and 403 responses.

## Permission Model Draft

Authentication:
- Management routes use authenticated admin identity.
- Security scheme should be cookieAuth and/or bearerAuth (confirm actual auth transport in mgmt openapi).

Authorization semantics:
- requireCrud('admins', '<action>') guards admin and role management operations.
- Invite-link redeem is intentionally public token-based flow.

401 vs 403:
- 401 Unauthorized: unauthenticated request or invalid token/session.
- 403 Forbidden: authenticated admin lacks required permission/role.

## Auth Operations

| method | path | operationId draft | security draft | notes |
|---|---|---|---|---|
| POST | /auth/login | managementAuthLogin | public | admin login |
| POST | /auth/logout | managementAuthLogout | cookieAuth or bearerAuth | session/token revocation |
| POST | /auth/mobile/token | managementAuthIssueMobileToken | public/mixed (verify) | mobile token issuance |
| POST | /auth/mobile/refresh | managementAuthRefreshMobileToken | bearerAuth (verify) | refresh flow |
| POST | /auth/mobile/revoke | managementAuthRevokeMobileToken | bearerAuth (verify) | revoke flow |
| GET | /auth/me | managementAuthMe | cookieAuth or bearerAuth | explicit ensureAuthenticated in route |

## Admin Operations

| method | path | operationId draft | required permission | notes |
|---|---|---|---|---|
| POST | /admins/invite-link/redeem | managementAdminInviteRedeem | public | invite token redemption |
| GET | /admins | managementAdminList | requireCrud('admins','read') | list admins |
| GET | /admins/roles | managementAdminRoleList | requireCrud('admins','read') | list admin roles |
| POST | /admins/roles | managementAdminRoleCreate | requireCrud('admins','create') (verify) | create role |
| PATCH | /admins/roles/{roleId} | managementAdminRoleUpdate | requireCrud('admins','update') (verify) | update role |
| DELETE | /admins/roles/{roleId} | managementAdminRoleDelete | requireCrud('admins','delete') (verify) | delete role |
| GET | /admins/{id} | managementAdminGetById | requireCrud('admins','read') | read admin |
| POST | /admins | managementAdminCreate | requireCrud('admins','create') | create admin account |
| PATCH | /admins/{id} | managementAdminUpdate | requireCrud('admins','update') | update admin account |
| DELETE | /admins/{id} | managementAdminDelete | requireCrud('admins','delete') | delete admin account |
| GET | /admins/{id}/invite-link | managementAdminInviteGet | requireCrud('admins','read') | fetch invite link |
| POST | /admins/{id}/invite-link | managementAdminInviteCreate | requireCrud('admins','update') | create/rotate invite link |
| DELETE | /admins/{id}/invite-link | managementAdminInviteDelete | requireCrud('admins','update') | revoke invite link |

## Required Response Patterns

For auth-protected operations:
- 401 Unauthorized
- 403 Forbidden (when authenticated but missing required permission)

For invite and account mutations:
- 400 invalid payload/id
- 404 target admin/role not found
- 409 duplicate credential or unique constraint conflict
- 500 internal server error

## Invite-Link Flow Documentation Notes

Include dedicated prose for:
- token issuance endpoint and lifecycle
- redemption endpoint (public) and one-time/expiry behavior
- revocation endpoint semantics
- expected invalid/expired token errors (400 or 404 depending on controller behavior)

## Role/Permission Schema Draft

Create reusable components:
- ManagementAdminAccount
- ManagementAdminRole
- ManagementAdminPermissions
- ManagementInviteLink
- ManagementAuthSession

Each operation should reference these components instead of inline schemas.
