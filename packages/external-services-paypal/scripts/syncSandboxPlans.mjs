import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SANDBOX_API = 'https://api-m.sandbox.paypal.com';
const PRODUCT_NAME = 'Podverse Premium';
const MONTHLY_PLAN_NAME = 'Podverse Premium Monthly';
const ANNUAL_PLAN_NAME = 'Podverse Premium Annual';

const overridesDir =
  process.env.PODVERSE_HOME_OVERRIDES_DIR ??
  path.join(os.homedir(), '.config', 'podverse', 'local-env-overrides');

function readEnvFile(filePath) {
  const values = {};
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) {
      continue;
    }
    const separator = trimmed.indexOf('=');
    if (separator === -1) {
      continue;
    }
    const key = trimmed.slice(0, separator);
    let value = trimmed.slice(separator + 1);
    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

async function payPalJson(url, accessToken, init) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...init?.headers,
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = payload === null ? response.statusText : JSON.stringify(payload);
    throw new Error(`PayPal ${response.status} ${url}: ${detail}`);
  }
  return payload;
}

async function getAccessToken(clientId, clientSecret) {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch(`${SANDBOX_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload === null || typeof payload.access_token !== 'string') {
    throw new Error(`PayPal OAuth token request failed with status ${response.status}`);
  }
  return payload.access_token;
}

function readNamedId(items, name) {
  if (!Array.isArray(items)) {
    return null;
  }
  const match = items.find(
    (item) => item !== null && item.name === name && typeof item.id === 'string'
  );
  return match === undefined ? null : match.id;
}

async function findOrCreateProduct(accessToken) {
  const listed = await payPalJson(
    `${SANDBOX_API}/v1/catalogs/products?page_size=20&page=1&total_required=true`,
    accessToken
  );
  const existingId = readNamedId(listed.products, PRODUCT_NAME);
  if (existingId !== null) {
    return existingId;
  }
  const created = await payPalJson(`${SANDBOX_API}/v1/catalogs/products`, accessToken, {
    method: 'POST',
    headers: { 'PayPal-Request-Id': 'podverse-premium-catalog-product' },
    body: JSON.stringify({
      name: PRODUCT_NAME,
      description: 'Podverse Premium membership',
      type: 'SERVICE',
      category: 'SOFTWARE',
    }),
  });
  if (typeof created.id !== 'string') {
    throw new Error('PayPal catalog product response is missing id');
  }
  return created.id;
}

function planBody(productId, name, intervalUnit, amount) {
  return {
    product_id: productId,
    name,
    description: name,
    status: 'ACTIVE',
    billing_cycles: [
      {
        frequency: { interval_unit: intervalUnit, interval_count: 1 },
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: { value: amount, currency_code: 'USD' },
        },
      },
    ],
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee_failure_action: 'CONTINUE',
      payment_failure_threshold: 3,
    },
  };
}

async function findOrCreatePlan(accessToken, productId, name, intervalUnit, amount, requestId) {
  const listed = await payPalJson(
    `${SANDBOX_API}/v1/billing/plans?product_id=${encodeURIComponent(productId)}&page_size=20&page=1&total_required=true`,
    accessToken
  );
  const existingId = readNamedId(listed.plans, name);
  if (existingId !== null) {
    return existingId;
  }
  const created = await payPalJson(`${SANDBOX_API}/v1/billing/plans`, accessToken, {
    method: 'POST',
    headers: {
      Prefer: 'return=representation',
      'PayPal-Request-Id': requestId,
    },
    body: JSON.stringify(planBody(productId, name, intervalUnit, amount)),
  });
  if (typeof created.id !== 'string') {
    throw new Error(`PayPal plan response for ${name} is missing id`);
  }
  return created.id;
}

const paypalEnv = readEnvFile(path.join(overridesDir, 'paypal.env'));
const clientId = paypalEnv.PAYPAL_CLIENT_ID ?? '';
const clientSecret = paypalEnv.PAYPAL_CLIENT_SECRET ?? '';
if (clientId === '' || clientSecret === '') {
  throw new Error('PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET must be set in the home paypal.env');
}

const accessToken = await getAccessToken(clientId, clientSecret);
const productId = await findOrCreateProduct(accessToken);
const monthlyPlanId = await findOrCreatePlan(
  accessToken,
  productId,
  MONTHLY_PLAN_NAME,
  'MONTH',
  '3.00',
  'podverse-premium-plan-monthly'
);
const annualPlanId = await findOrCreatePlan(
  accessToken,
  productId,
  ANNUAL_PLAN_NAME,
  'YEAR',
  '30.00',
  'podverse-premium-plan-annual'
);

process.stdout.write(
  `BILLING_PRODUCT_PAYPAL_AUTO_RENEW_MONTHLY_PLAN_ID=${monthlyPlanId}\n` +
    `BILLING_PRODUCT_PAYPAL_AUTO_RENEW_ANNUAL_PLAN_ID=${annualPlanId}\n`
);
