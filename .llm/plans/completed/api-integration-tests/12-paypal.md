# 12 — PayPal Routes

## Goal

Integration tests for PayPal order creation, order lookup, and webhook handling.

## Routes under test

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/v1/paypal/:payment_id` | Public | Get PayPal order by payment ID |
| POST | `/api/v1/paypal/create` | Public | Create PayPal order |
| POST | `/api/v1/paypal/webhooks/payment-completed` | Public | PayPal webhook: payment completed |

## File

`apps/api/src/test/paypal.test.ts`

## Test cases

### GET /paypal/:payment_id

- **200 with valid payment ID** — mocks PayPal service to return order data
- **404 with invalid payment ID** — mocks service to return null
- **500 when PayPal service fails** — mocks error

### POST /paypal/create

- **200 with valid order data** — mocks PayPal order creation, returns order ID and approval URL
- **400 with invalid body** — missing required fields
- **500 when PayPal service fails**

### POST /paypal/webhooks/payment-completed

- **200 with valid webhook payload** — mocks webhook verification and payment processing
- **400 with invalid webhook signature** — mocks signature verification failure
- **200 with duplicate webhook** — idempotent handling (same payment processed twice)

## Mocking strategy

- Mock PayPal service from `@podverse/external-services-paypal` or equivalent
- Mock membership service for webhook processing (membership activation)

## Verification

```bash
./scripts/nix/with-env npm run test -w apps/api -- src/test/paypal.test.ts
```
