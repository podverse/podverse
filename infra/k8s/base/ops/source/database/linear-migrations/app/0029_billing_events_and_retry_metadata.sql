-- 0029 migration
-- Adds normalized billing domain event storage and retry metadata for renewal orchestration.

CREATE TABLE billing_domain_event (
    id BIGSERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES account(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (
      event_type IN (
        'payment_settled',
        'renewal_succeeded',
        'renewal_failed',
        'pay_on_demand_extension_requested'
      )
    ),
    idempotency_key VARCHAR(128),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at server_time_with_default
);

CREATE INDEX idx_billing_domain_event_account_created
  ON billing_domain_event (account_id, created_at DESC);

CREATE UNIQUE INDEX uq_billing_domain_event_idempotency
  ON billing_domain_event (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE account_membership_status
ADD COLUMN renewal_retry_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN renewal_retry_backoff_until TIMESTAMP;

CREATE INDEX idx_account_membership_status_renewal_retry_backoff_until
  ON account_membership_status(renewal_retry_backoff_until)
  WHERE renewal_retry_backoff_until IS NOT NULL;
