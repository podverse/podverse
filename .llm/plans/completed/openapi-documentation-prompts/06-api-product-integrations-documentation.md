# Prompt 6 Result: API Product + Integrations OpenAPI Draft

Scope route modules:
- product/membership
- externalServices
- paypal
- metaboost
- mq
- stats

Primary objective:
- Draft operation-complete OpenAPI docs for product/integration-facing routes.
- Explicitly document side effects, webhook constraints, and async behavior.

## Operation Inventory

| method | path | operationId draft | security draft | side-effect profile |
|---|---|---|---|---|
| GET | /product/membership/pricing | productMembershipGetPricing | public/mixed (verify) | none (read) |
| GET | /product/membership/billing-read-model | productMembershipGetBillingReadModel | cookieAuth or bearerAuth (verify) | none (read) |
| GET | /product/membership | productMembershipGetResolvedMembership | cookieAuth or bearerAuth (verify) | none (read) |
| GET | /external-services/podcast-index/feed/{podcast_index_id} | externalServicesPodcastIndexFeedById | public | none (proxy/read) |
| GET | /external-services/podcast-index/search/podcasts | externalServicesPodcastIndexSearchPodcasts | public | none (proxy/read) |
| GET | /paypal/{payment_id} | paypalGetOrderStatus | cookieAuth or bearerAuth (verify) | none (read), payment state exposure |
| POST | /paypal/create | paypalCreateOrder | cookieAuth or bearerAuth (verify) | creates remote payment order |
| POST | /paypal/webhooks/payment-completed | paypalWebhookPaymentCompleted | signed webhook/public endpoint (verify) | updates account/order membership state |
| GET | /metaboost/mbrss-v1/mint-app-assertion/rate-limit-status | metaboostMintAssertionRateLimitStatus | cookieAuth or bearerAuth (verify) | read current mint quota |
| POST | /metaboost/mbrss-v1/mint-app-assertion | metaboostMintAppAssertion | cookieAuth or bearerAuth | consumes per-user rate-limited mint capacity |
| POST | /mq/rss/add/on-demand | mqRssAddOnDemand | cookieAuth or bearerAuth (verify) | enqueues async add event |
| POST | /mq/rss/refresh/on-demand | mqRssRefreshOnDemand | cookieAuth or bearerAuth (verify) | enqueues async refresh event |
| POST | /stats/account | statsTrackAccountEvent | public/mixed (verify) | writes analytics event |
| POST | /stats/channel | statsTrackChannelEvent | public/mixed (verify) | writes analytics event |
| POST | /stats/clip | statsTrackClipEvent | public/mixed (verify) | writes analytics event |
| POST | /stats/item | statsTrackItemEvent | public/mixed (verify) | writes analytics event |
| POST | /stats/playlist | statsTrackPlaylistEvent | public/mixed (verify) | writes analytics event |

## Integration-Specific Documentation Rules

### Product membership routes
- Document pricing as cacheable read with clear currency/interval metadata.
- Document billing-read-model as account-scoped read model if auth required.
- Document resolved membership response as authoritative membership state for clients.

### PayPal routes
- /paypal/create:
  - request includes order context and product/billing identifiers.
  - response includes provider order identifiers and approval URLs.
- /paypal/webhooks/payment-completed:
  - document signature verification requirement and expected headers.
  - return 2xx quickly; internal processing can continue asynchronously.
  - include idempotency behavior for duplicate webhook delivery.

### Metaboost routes
- /metaboost/.../rate-limit-status returns current allowance and reset timing.
- /metaboost/.../mint-app-assertion:
  - consumes quota and returns minted assertion payload.
  - document 429 with retry hints when rate limit exhausted.
  - include note from code comment: one mint per authenticated user per minute.

### MQ routes
- Both endpoints enqueue work and should document eventual consistency.
- Return should include request correlation token/job identifier when available.
- Include 202 Accepted if async enqueue semantics are used by controller.

### Stats routes
- Treat as write-only telemetry endpoints.
- Include anti-abuse constraints and payload validation behavior.
- Use lightweight success envelope to avoid coupling to internal analytics pipeline.

## Error Semantics Draft

For all mutating integration routes, include:
- 400 invalid payload
- 401 unauthorized (where auth required)
- 403 forbidden (policy denial)
- 404 resource not found (when applicable)
- 409 conflict/idempotency replay (webhooks/payment updates)
- 429 rate limited (metaboost and any endpoint with throttling)
- 500 internal error

## Async + Side-Effect Example Patterns

### MQ enqueue response example
```yaml
202:
  description: Enqueued for asynchronous processing
  content:
    application/json:
      schema:
        type: object
        properties:
          accepted:
            type: boolean
          requestId:
            type: string
```

### Webhook idempotent success example
```yaml
200:
  description: Webhook accepted (idempotent)
  content:
    application/json:
      schema:
        type: object
        properties:
          processed:
            type: boolean
          duplicate:
            type: boolean
```

## Postman/Swagger Compatibility Notes

- Keep all path params in OpenAPI form {param}.
- Keep webhook requestBody schemas explicit and example-rich.
- Avoid unsupported polymorphism for event payloads; use explicit event-type enum plus one concrete schema per endpoint.
