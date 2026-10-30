// Registers a placeholder FCM device on the seeded account, so a flow can open notification
// settings as an account that turned push on from another device. A simulator cannot be relied on
// for a real push token, so the device comes from the API. Nothing is ever delivered to it.
//
// Runs on the host JVM (not the device), so `localhost` is correct for both iOS and Android runs.
// Requires the Mobile E2E API on :4230 and the web E2E seed fixtures.
//
// Each run signs in as its own session and deletes that session before it ends, so the account's
// session list is unchanged. add first clears a device or session left by an interrupted run.
//
// Env (via `runScript: { env: ... }`):
//   E2E_PUSH_DEVICE_ACTION   add or remove. Required.

const optional = (value, fallback) =>
  typeof value === 'string' && value.length > 0 ? value : fallback;

const API_BASE_URL = optional(
  typeof E2E_API_BASE_URL !== 'undefined' ? E2E_API_BASE_URL : null,
  'http://localhost:4230/api/v2'
);
const LOGIN_EMAIL = optional(
  typeof E2E_LOGIN_EMAIL !== 'undefined' ? E2E_LOGIN_EMAIL : null,
  'e2e-user@example.com'
);
const LOGIN_PASSWORD = optional(
  typeof E2E_LOGIN_PASSWORD !== 'undefined' ? E2E_LOGIN_PASSWORD : null,
  'Test!1Aa'
);
const ACTION = optional(
  typeof E2E_PUSH_DEVICE_ACTION !== 'undefined' ? E2E_PUSH_DEVICE_ACTION : null,
  ''
);

const SESSION_LABEL = 'E2E Push Device Fixture';
const FIXTURE_INSTALLATION_ID = 'e2e-push-device-fixture';
const FIXTURE_FCM_TOKEN = 'e2e-push-device-fixture-token';
// AccountFCMDevicePlatformEnum.Android. This script runs in Maestro's JavaScript and cannot import
// the enum.
const FIXTURE_PLATFORM = 'android';

if (ACTION !== 'add' && ACTION !== 'remove') {
  throw new Error('push-device-fixture: E2E_PUSH_DEVICE_ACTION must be add or remove');
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

const authHeaders = (accessToken) =>
  Object.assign({}, JSON_HEADERS, { Authorization: `Bearer ${accessToken}` });

const failOn = (label, response) => {
  if (!response.ok) {
    throw new Error(`push-device-fixture: ${label} failed (${response.status}) ${response.body}`);
  }
};

const login = () => {
  const response = http.post(`${API_BASE_URL}/auth/mobile/token`, {
    headers: JSON_HEADERS,
    body: JSON.stringify({
      email: LOGIN_EMAIL,
      password: LOGIN_PASSWORD,
      device_label: SESSION_LABEL,
    }),
  });
  failOn('mobile token', response);
  const accessToken = json(response.body).access_token;
  if (typeof accessToken !== 'string' || accessToken.length === 0) {
    throw new Error('push-device-fixture: mobile token response had no access_token');
  }
  return accessToken;
};

const deleteFixtureDevice = (accessToken) => {
  const response = http.request(`${API_BASE_URL}/account/fcm-device/delete`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      fcm_token: FIXTURE_FCM_TOKEN,
      installation_id: FIXTURE_INSTALLATION_ID,
    }),
  });
  failOn('delete fixture device', response);
};

const createFixtureDevice = (accessToken) => {
  const response = http.post(`${API_BASE_URL}/account/fcm-device/create`, {
    headers: authHeaders(accessToken),
    body: JSON.stringify({
      fcm_token: FIXTURE_FCM_TOKEN,
      installation_id: FIXTURE_INSTALLATION_ID,
      platform: FIXTURE_PLATFORM,
    }),
  });
  failOn('create fixture device', response);
};

const deleteSession = (accessToken, idText, label) => {
  const response = http.request(`${API_BASE_URL}/auth/sessions/${encodeURIComponent(idText)}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  });
  failOn(label, response);
};

const endFixtureSessions = (accessToken) => {
  const response = http.get(`${API_BASE_URL}/auth/sessions`, {
    headers: authHeaders(accessToken),
  });
  failOn('list sessions', response);
  const rows = json(response.body).rows;
  if (!Array.isArray(rows)) {
    throw new Error('push-device-fixture: sessions response had no rows array');
  }
  const current = rows.find((row) => row && row.is_current === true);
  if (
    current === undefined ||
    typeof current.id_text !== 'string' ||
    current.id_text.length === 0
  ) {
    throw new Error('push-device-fixture: sessions response had no current id_text');
  }
  rows.forEach((row) => {
    if (!row || row.is_current === true || row.device_label !== SESSION_LABEL) {
      return;
    }
    deleteSession(accessToken, row.id_text, `delete leftover ${row.id_text}`);
  });
  deleteSession(accessToken, current.id_text, 'end session');
};

const accessToken = login();
deleteFixtureDevice(accessToken);
if (ACTION === 'add') {
  createFixtureDevice(accessToken);
}
endFixtureSessions(accessToken);
