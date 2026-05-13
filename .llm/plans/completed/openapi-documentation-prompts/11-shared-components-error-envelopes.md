# Prompt 11 Result: Shared Components + Error Envelopes

Objective:
- Define reusable component model for both API and Management API OpenAPI specs.
- Minimize inline duplication.

## Shared Component Library Draft

Security schemes:
- cookieAuth
- bearerAuth

Core schemas:
- ErrorEnvelope
- ValidationErrorEnvelope
- PaginationMeta
- SortMeta
- IdTextRef
- TimestampFields

Identity/auth schemas:
- AccountSummary
- AdminAccountSummary
- AdminPermissions
- AuthSessionSummary
- MobileTokenPair

Product schemas:
- ProductMembershipResolved
- ProductMembershipSettingsPatch
- BillingPriceRow
- BillingPriceScheduleRequest
- BillingPriceLifecycleResult

Notification/device schemas:
- FcmDevice
- WebpushDevice
- UpDevice
- NotificationChannelPreference
- NotificationTypePreference

Content/discovery schemas:
- CategorySummary
- ChannelSummary
- FeedDetail
- ItemSummary
- ClipSummary
- PlaylistSummary

Management operation schemas:
- DatabaseTableMeta
- DatabaseQueryRequest
- DatabaseQueryResult
- StorageObjectSummary
- StorageBulkDeleteRequest
- WorkerCommandSummary

## Shared Responses Draft

Create reusable responses under components.responses:
- BadRequest
- Unauthorized
- Forbidden
- NotFound
- Conflict
- TooManyRequests
- InternalServerError
- ValidationFailed

Recommended envelope pattern:
```yaml
ErrorEnvelope:
  type: object
  properties:
    message:
      type: string
    code:
      type: string
    details:
      type: object
      additionalProperties: true
```

Validation envelope:
```yaml
ValidationErrorEnvelope:
  allOf:
    - $ref: '#/components/schemas/ErrorEnvelope'
    - type: object
      properties:
        fields:
          type: array
          items:
            type: object
            properties:
              path:
                type: string
              message:
                type: string
```

## Reuse Rules

- Prefer component references for every requestBody and response body.
- No duplicated inline anonymous objects for common entities.
- Keep naming stable across both specs to improve client generation.
- Use spec-local prefixes only when shape differs materially between API and management-api.

## Migration Checklist

- replace inline error objects with response refs
- replace ad-hoc pagination fields with PaginationMeta
- consolidate auth payloads into AuthSessionSummary/MobileTokenPair
- normalize id_text fields to shared IdTextRef usage
