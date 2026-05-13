# Prompt 2 Result: Management API Route Matrix

- Source: `apps/management-api/src/routes` (including `product/`)
- Module count: 10
- Operation rows: 55
- Unresolved operation rows: 0

## Highest-Risk Focus Areas

- `database` routes (query + CRUD)
- `storage` routes (delete and bulk-delete)
- `product/pricing` lifecycle operations
- `product/membership` privileged settings updates
- `admins` mutation and invite-link flows

## apps/management-api/src/routes/admins.ts

| method | canonical path | permission requirement | request schema source | response schema source | risk class | notes |
|---|---|---|---|---|---|---|
| POST | /admins/invite-link/redeem | public | route/controller validation (verify) | controller JSON/DTO inferred | high |  |
| GET | /admins | requireCrud('admins', 'read') | query/path validation (verify) | controller JSON/DTO inferred | high |  |
| GET | /admins/roles | requireCrud('admins', 'read') | query/path validation (verify) | controller JSON/DTO inferred | high |  |
| POST | /admins/roles | requireCrud('admins', 'read') | route/controller validation (verify) | controller JSON/DTO inferred | high |  |
| PATCH | /admins/roles/:roleId | requireCrud('admins', 'create') | route/controller validation (verify) | controller JSON/DTO inferred | high |  |
| DELETE | /admins/roles/:roleId | requireCrud('admins', 'update') | route/controller validation (verify) | controller JSON/DTO inferred | high |  |
| GET | /admins/:id | requireCrud('admins', 'delete') | query/path validation (verify) | controller JSON/DTO inferred | high |  |
| POST | /admins | requireCrud('admins', 'create') | route/controller validation (verify) | controller JSON/DTO inferred | high |  |
| PATCH | /admins/:id | requireCrud('admins', 'update') | route/controller validation (verify) | controller JSON/DTO inferred | high |  |
| DELETE | /admins/:id | requireCrud('admins', 'delete') | route/controller validation (verify) | controller JSON/DTO inferred | high |  |
| GET | /admins/:id/invite-link | requireCrud('admins', 'read') | query/path validation (verify) | controller JSON/DTO inferred | high |  |
| POST | /admins/:id/invite-link | requireCrud('admins', 'update') | route/controller validation (verify) | controller JSON/DTO inferred | high |  |
| DELETE | /admins/:id/invite-link | requireCrud('admins', 'update') | route/controller validation (verify) | controller JSON/DTO inferred | high |  |

## apps/management-api/src/routes/auth.ts

| method | canonical path | permission requirement | request schema source | response schema source | risk class | notes |
|---|---|---|---|---|---|---|
| POST | /auth/login | authenticated | route/controller validation (verify) | controller JSON/DTO inferred | medium |  |
| POST | /auth/logout | authenticated | route/controller validation (verify) | controller JSON/DTO inferred | medium |  |
| POST | /auth/mobile/token | authenticated | route/controller validation (verify) | controller JSON/DTO inferred | medium |  |
| POST | /auth/mobile/refresh | authenticated | route/controller validation (verify) | controller JSON/DTO inferred | medium |  |
| POST | /auth/mobile/revoke | authenticated | route/controller validation (verify) | controller JSON/DTO inferred | medium |  |
| GET | /auth/me | authenticated | query/path validation (verify) | controller JSON/DTO inferred | low |  |

## apps/management-api/src/routes/database.ts

| method | canonical path | permission requirement | request schema source | response schema source | risk class | notes |
|---|---|---|---|---|---|---|
| GET | /database/tables | authenticated | query/path validation (verify) | controller JSON/DTO inferred | high |  |
| GET | /database/:table/meta | authenticated | query/path validation (verify) | controller JSON/DTO inferred | high |  |
| POST | /database/:table/query | requireCrud(getPermissionResourceForTable('__dynamic__') | route/controller validation (verify) | controller JSON/DTO inferred | high |  |
| GET | /database/:table/:id | authenticated | query/path validation (verify) | controller JSON/DTO inferred | high |  |
| POST | /database/:table | authenticated | route/controller validation (verify) | controller JSON/DTO inferred | high |  |
| PATCH | /database/:table/:id | authenticated | route/controller validation (verify) | controller JSON/DTO inferred | high |  |
| DELETE | /database/:table/:id | authenticated | route/controller validation (verify) | controller JSON/DTO inferred | high |  |

## apps/management-api/src/routes/feeds.ts

| method | canonical path | permission requirement | request schema source | response schema source | risk class | notes |
|---|---|---|---|---|---|---|
| GET | /feeds/options | requireCrud('feeds', 'read') | query/path validation (verify) | controller JSON/DTO inferred | low |  |
| GET | /feeds | requireCrud('feeds', 'read') | query/path validation (verify) | controller JSON/DTO inferred | low |  |
| GET | /feeds/lookup | requireCrud('feeds', 'read') | query/path validation (verify) | controller JSON/DTO inferred | low |  |
| PATCH | /feeds/:id/policy-state | requireCrud('feeds', 'update') | route/controller validation (verify) | controller JSON/DTO inferred | medium |  |

## apps/management-api/src/routes/product/pricing.ts

| method | canonical path | permission requirement | request schema source | response schema source | risk class | notes |
|---|---|---|---|---|---|---|
| GET | /products/pricing/active | requireCrud('billing_prices', 'read') | query/path validation (verify) | controller JSON/DTO inferred | high |  |
| POST | /products/pricing/schedule | requireCrud('billing_prices', 'create') | route/controller validation (verify) | controller JSON/DTO inferred | high |  |
| POST | /products/pricing/:id/activate | requireCrud('billing_prices', 'update') | route/controller validation (verify) | controller JSON/DTO inferred | high |  |
| POST | /products/pricing/:id/deprecate | requireCrud('billing_prices', 'update') | route/controller validation (verify) | controller JSON/DTO inferred | high |  |

## apps/management-api/src/routes/product/productMembership.ts

| method | canonical path | permission requirement | request schema source | response schema source | risk class | notes |
|---|---|---|---|---|---|---|

## apps/management-api/src/routes/stats.ts

| method | canonical path | permission requirement | request schema source | response schema source | risk class | notes |
|---|---|---|---|---|---|---|
| GET | /stats/:entityType/top | requireCrud('stats', 'read') | query/path validation (verify) | controller JSON/DTO inferred | low |  |
| GET | /stats/:entityType/search | requireCrud('stats', 'read') | query/path validation (verify) | controller JSON/DTO inferred | low |  |
| GET | /stats/:entityType/:id | requireCrud('stats', 'read') | query/path validation (verify) | controller JSON/DTO inferred | low |  |

## apps/management-api/src/routes/storage.ts

| method | canonical path | permission requirement | request schema source | response schema source | risk class | notes |
|---|---|---|---|---|---|---|
| GET | /storage | requireCrud('bucket', 'read') | query/path validation (verify) | controller JSON/DTO inferred | high |  |
| GET | /storage/objects | requireCrud('bucket', 'read') | query/path validation (verify) | controller JSON/DTO inferred | high |  |
| GET | /storage/objects/count | requireCrud('bucket', 'read') | query/path validation (verify) | controller JSON/DTO inferred | high |  |
| GET | /storage/objects/metadata | requireCrud('bucket', 'read') | query/path validation (verify) | controller JSON/DTO inferred | high |  |
| GET | /storage/objects/download | requireCrud('bucket', 'read') | query/path validation (verify) | controller JSON/DTO inferred | high |  |
| DELETE | /storage/objects | requireCrud('bucket', 'delete') | route/controller validation (verify) | controller JSON/DTO inferred | high |  |
| POST | /storage/objects/bulk-delete | requireCrud('bucket', 'delete') | route/controller validation (verify) | controller JSON/DTO inferred | high |  |
| POST | /storage/objects/delete-all-by-prefix | requireCrud('bucket', 'delete') | route/controller validation (verify) | controller JSON/DTO inferred | high |  |

## apps/management-api/src/routes/users.ts

| method | canonical path | permission requirement | request schema source | response schema source | risk class | notes |
|---|---|---|---|---|---|---|
| GET | /users | superuser | query/path validation (verify) | controller JSON/DTO inferred | low |  |
| GET | /users/:id | superuser | query/path validation (verify) | controller JSON/DTO inferred | low |  |
| POST | /users | superuser | route/controller validation (verify) | controller JSON/DTO inferred | medium |  |
| PATCH | /users/:id | superuser | route/controller validation (verify) | controller JSON/DTO inferred | medium |  |
| DELETE | /users/:id | superuser | route/controller validation (verify) | controller JSON/DTO inferred | high |  |
| POST | /users/:id/password | superuser | route/controller validation (verify) | controller JSON/DTO inferred | high |  |
| GET | /users/:id/invite-link | superuser | query/path validation (verify) | controller JSON/DTO inferred | high |  |
| POST | /users/:id/invite-link | superuser | route/controller validation (verify) | controller JSON/DTO inferred | high |  |
| DELETE | /users/:id/invite-link | superuser | route/controller validation (verify) | controller JSON/DTO inferred | high |  |

## apps/management-api/src/routes/workers.ts

| method | canonical path | permission requirement | request schema source | response schema source | risk class | notes |
|---|---|---|---|---|---|---|
| GET | /workers/commands | superuser | query/path validation (verify) | controller JSON/DTO inferred | low |  |

