# 01 - Metaboost Public Contract and Breadcrumb Metadata

## Scope

Update Metaboost public standards list endpoints so they:
- Never return `senderGuid` / `sender_guid`.
- Return breadcrumb-capable context metadata for Podverse navigation.
- Keep pagination behavior stable.
- Keep OpenAPI and integration tests aligned.

## Locked Response Contract (public list rows)

Use one stable row schema for `mb-v1` and `mbrss-v1` public lists:

```ts
type PublicBoostMessageRow = {
  senderName: string | null;
  appName: string;
  body: string | null;
  createdAt: string;
  breadcrumbContext: null | {
    level: 'channel' | 'item';
    podcastGuid: string | null;
    podcastLabel: string | null;
    itemGuid: string | null;
    itemLabel: string | null;
    isSubBucket: boolean;
  };
};
```

Hard requirements:
- `senderGuid` and `sender_guid` must never be present in public list responses.
- Existing pagination envelope remains unchanged (`page`, `limit`, `total`, `totalPages`, `messages`).

## Target Repos and Files

### Metaboost API controllers/routes
- `/Users/mitcheldowney/repos/pv/metaboost/apps/api/src/controllers/mbrssV1Controller.ts`
- `/Users/mitcheldowney/repos/pv/metaboost/apps/api/src/controllers/mbV1Controller.ts`
- `/Users/mitcheldowney/repos/pv/metaboost/apps/api/src/routes/mbrssV1.ts`
- `/Users/mitcheldowney/repos/pv/metaboost/apps/api/src/routes/mbV1.ts`

### Metaboost OpenAPI
- `/Users/mitcheldowney/repos/pv/metaboost/apps/api/src/openapi-mbrssV1.ts`
- `/Users/mitcheldowney/repos/pv/metaboost/apps/api/src/openapi-mbV1.ts`

### Metaboost service/DTO shaping (if needed)
- `/Users/mitcheldowney/repos/pv/metaboost/packages/orm/src/services/BucketMessageService.ts`
- New API-level response mapper module if cleaner than mutating ORM hydrate behavior.

### Metaboost API tests
- `/Users/mitcheldowney/repos/pv/metaboost/apps/api/src/test/mbrss-v1-spec-contract.test.ts`
- `/Users/mitcheldowney/repos/pv/metaboost/apps/api/src/test/mb-v1-spec-contract.test.ts`

## Implementation Steps

1. Define a public-safe message response shape for standards list endpoints.
   - Omit `senderGuid`.
   - Preserve required list display fields (`senderName`, `appName`, `createdAt`, `body`).
2. Add breadcrumb metadata fields to public message payload for subbucket-aware display.
   - Include GUID-based context so Podverse can resolve links.
   - Include labels needed for breadcrumb text.
   - Set `breadcrumbContext = null` when no breadcrumb should render.
   - Set `breadcrumbContext.isSubBucket = true` only when message context is below current bucket context.
3. Update mbrss and mb-v1 list handlers to serialize with the new public-safe mapper.
4. Update OpenAPI schemas to match payload exactly.
   - Remove `senderGuid`.
   - Document new breadcrumb fields.
   - Ensure channel/item list endpoints include page/limit query params in mbrss docs.
5. Add/adjust integration tests:
   - Assert `senderGuid` absent in all public list responses.
   - Assert breadcrumb metadata exists when message context is item/subbucket.
   - Assert `breadcrumbContext` is `null` for non-subbucket rows.
   - Assert schema parity across:
     - mbrss bucket list
     - mbrss channel list
     - mbrss item list
     - mb-v1 bucket list

## Verification

From Metaboost repo root:

```bash
./scripts/nix/with-env npm run test -w apps/api -- src/test/mbrss-v1-spec-contract.test.ts
./scripts/nix/with-env npm run test -w apps/api -- src/test/mb-v1-spec-contract.test.ts
```

## Exit Criteria

- Public list APIs still paginate correctly.
- `senderGuid` no longer appears in standards public list payloads.
- Breadcrumb metadata contract is documented and tested.
- OpenAPI exactly matches response payload fields for all public list paths.
