-- 0028 migration
-- Introduces DB-backed billing product and price catalog with effective windows.
-- Seeds premium monthly/annual USD pricing defaults and extends membership renewal metadata.

CREATE TABLE billing_product (
    id SERIAL PRIMARY KEY,
    product_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at server_time_with_default,
    updated_at server_time_with_default
);

CREATE TRIGGER set_updated_at_billing_product
BEFORE UPDATE ON billing_product
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_field();

CREATE TABLE billing_price (
    id SERIAL PRIMARY KEY,
    billing_product_id INTEGER NOT NULL REFERENCES billing_product(id) ON DELETE CASCADE,
    currency_code CHAR(3) NOT NULL,
    billing_cadence TEXT NOT NULL CHECK (billing_cadence IN ('monthly', 'annual')),
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    effective_from TIMESTAMP NOT NULL DEFAULT NOW(),
    effective_to TIMESTAMP,
    source TEXT NOT NULL DEFAULT 'manual',
    created_at server_time_with_default,
    updated_at server_time_with_default,
    CONSTRAINT billing_price_effective_window_check CHECK (
      effective_to IS NULL OR effective_to > effective_from
    ),
    CONSTRAINT billing_price_unique_window_start UNIQUE (
      billing_product_id,
      currency_code,
      billing_cadence,
      effective_from
    )
);

CREATE TRIGGER set_updated_at_billing_price
BEFORE UPDATE ON billing_price
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_field();

CREATE UNIQUE INDEX uq_billing_price_open_window
  ON billing_price (billing_product_id, currency_code, billing_cadence)
  WHERE effective_to IS NULL;

CREATE INDEX idx_billing_price_effective_lookup
  ON billing_price (billing_product_id, billing_cadence, currency_code, effective_from DESC);

CREATE TABLE billing_price_change_audit (
    id SERIAL PRIMARY KEY,
    billing_price_id INTEGER REFERENCES billing_price(id) ON DELETE SET NULL,
    changed_by_admin_account_id INTEGER,
    change_reason TEXT,
    previous_amount_cents INTEGER CHECK (previous_amount_cents IS NULL OR previous_amount_cents >= 0),
    new_amount_cents INTEGER CHECK (new_amount_cents IS NULL OR new_amount_cents >= 0),
    previous_effective_from TIMESTAMP,
    previous_effective_to TIMESTAMP,
    new_effective_from TIMESTAMP,
    new_effective_to TIMESTAMP,
    created_at server_time_with_default
);

INSERT INTO billing_product (product_code, name, is_active)
SELECT 'membership_premium', 'Premium Membership', TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM billing_product WHERE product_code = 'membership_premium'
);

INSERT INTO billing_price (
  billing_product_id,
  currency_code,
  billing_cadence,
  amount_cents,
  effective_from,
  effective_to,
  source
)
SELECT bp.id, 'USD', 'monthly', 300, NOW(), NULL, 'seed'
FROM billing_product bp
WHERE bp.product_code = 'membership_premium'
  AND NOT EXISTS (
    SELECT 1
    FROM billing_price p
    WHERE p.billing_product_id = bp.id
      AND p.currency_code = 'USD'
      AND p.billing_cadence = 'monthly'
      AND p.effective_to IS NULL
  );

INSERT INTO billing_price (
  billing_product_id,
  currency_code,
  billing_cadence,
  amount_cents,
  effective_from,
  effective_to,
  source
)
SELECT bp.id, 'USD', 'annual', 3000, NOW(), NULL, 'seed'
FROM billing_product bp
WHERE bp.product_code = 'membership_premium'
  AND NOT EXISTS (
    SELECT 1
    FROM billing_price p
    WHERE p.billing_product_id = bp.id
      AND p.currency_code = 'USD'
      AND p.billing_cadence = 'annual'
      AND p.effective_to IS NULL
  );

ALTER TABLE account_membership_status
ADD COLUMN billing_cadence TEXT CHECK (billing_cadence IN ('monthly', 'annual')),
ADD COLUMN auto_renew_mode TEXT CHECK (auto_renew_mode IN ('off', 'on')) DEFAULT 'off',
ADD COLUMN next_renewal_attempt_at TIMESTAMP,
ADD COLUMN last_renewal_attempt_at TIMESTAMP,
ADD COLUMN last_renewal_status TEXT CHECK (
  last_renewal_status IN ('none', 'succeeded', 'failed')
) DEFAULT 'none',
ADD COLUMN last_extension_idempotency_key VARCHAR(128),
ADD COLUMN last_renewal_idempotency_key VARCHAR(128);

CREATE INDEX idx_account_membership_status_next_renewal_attempt_at
  ON account_membership_status(next_renewal_attempt_at)
  WHERE next_renewal_attempt_at IS NOT NULL;
