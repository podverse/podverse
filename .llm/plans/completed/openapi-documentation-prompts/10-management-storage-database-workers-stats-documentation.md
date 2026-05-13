# Prompt 10 Result: Management Storage + Database + Workers + Stats OpenAPI Draft

Scope route modules:
- storage
- database
- workers
- stats

Objective:
- Draft operation-complete documentation for operational and potentially destructive management routes.
- Include allowlist constraints, safeguards, and large-response caveats.

## Operations

| method | path | operationId draft | authz draft | risk focus |
|---|---|---|---|---|
| GET | /storage | managementStorageConfigGet | requireCrud('bucket','read') | environment/storage feature state |
| GET | /storage/objects | managementStorageObjectsList | requireCrud('bucket','read') | large list responses |
| GET | /storage/objects/count | managementStorageObjectsCount | requireCrud('bucket','read') | potentially expensive counts |
| GET | /storage/objects/metadata | managementStorageObjectMetadataGet | requireCrud('bucket','read') | object metadata visibility |
| GET | /storage/objects/download | managementStorageObjectDownload | requireCrud('bucket','read') | binary/object streaming |
| DELETE | /storage/objects | managementStorageObjectDelete | requireCrud('bucket','delete') | destructive delete |
| POST | /storage/objects/bulk-delete | managementStorageObjectsBulkDelete | requireCrud('bucket','delete') | capped bulk destructive delete |
| POST | /storage/objects/delete-all-by-prefix | managementStorageObjectsDeleteByPrefix | requireCrud('bucket','delete') | high-impact prefix-wide delete |
| GET | /database/tables | managementDatabaseTablesList | authenticated + policy (verify) | table discovery |
| GET | /database/{table}/meta | managementDatabaseTableMeta | authenticated + policy (verify) | schema/column metadata |
| POST | /database/{table}/query | managementDatabaseTableQuery | requireCrud(dynamic resource) | arbitrary query surface |
| GET | /database/{table}/{id} | managementDatabaseRowGet | authenticated + policy (verify) | direct row access |
| POST | /database/{table} | managementDatabaseRowCreate | authenticated + policy (verify) | generic create |
| PATCH | /database/{table}/{id} | managementDatabaseRowUpdate | authenticated + policy (verify) | generic update |
| DELETE | /database/{table}/{id} | managementDatabaseRowDelete | authenticated + policy (verify) | generic delete |
| GET | /workers/commands | managementWorkersCommandsList | superuser | command inventory exposure |
| GET | /stats/{entityType}/top | managementStatsTop | requireCrud('stats','read') | ranking read |
| GET | /stats/{entityType}/search | managementStatsSearch | requireCrud('stats','read') | filter/search read |
| GET | /stats/{entityType}/{id} | managementStatsById | requireCrud('stats','read') | detail read |

## Allowlist and Safeguard Documentation Draft

Database routes:
- document permitted table names via allowlist, not arbitrary dynamic table access.
- document rejected table values as 400/403.
- document row-id type coercion and invalid-id behavior.

Storage routes:
- document object key safety constraints and prefix restrictions.
- document hard caps for bulk operations where implemented.
- document feature-disabled mode behavior (404 with explanatory message in storage module).

Workers routes:
- document as read-only command listing unless command execution endpoints are added later.

Stats routes:
- constrain entityType values via enum in OpenAPI.
- document query filters and pagination if available.

## Large Response and Streaming Caveats

For /storage/objects and /storage/objects/download:
- document potentially large payload sizes.
- include optional pagination/chunking params where supported.
- for download endpoint, use binary response schema:
  - content type application/octet-stream when appropriate.

For database query/list operations:
- include max page/row limits and truncation semantics.
- include warning about expensive unrestricted queries.

## Error Semantics Draft

Base responses:
- 400 invalid table/key/body/params
- 401 unauthenticated
- 403 insufficient permission or blocked table
- 404 missing row/object/feature disabled
- 413 payload too large (if enforced)
- 429 throttle (if applicable)
- 500 internal error

Destructive endpoints should include explicit examples for:
- accidental broad prefix delete protection failures
- invalid key/path rejection
- permission denied for delete operations
