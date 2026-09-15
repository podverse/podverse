// Seeds a now-playing row for the seeded E2E account so a Maestro flow can act as if a second
// device had been listening. Maestro drives one device, so the "other device" side of a handoff
// has to come from the API.
//
// Runs on the host JVM (not the device), so `localhost` is correct for both iOS and Android runs.
// Requires the Mobile E2E API on :4230 and the web E2E seed fixtures.
//
// Env (via `runScript: { env: ... }`):
//   E2E_ITEM_ID_TEXT        required, item id_text to make now-playing
//   E2E_PLAYBACK_POSITION   seconds, default 0
//   E2E_PLAYBACK_EVENT_KIND one of the shared playback event kinds, default "play"
//   E2E_LAST_PLAYED_AT      ISO-8601 timestamp. When omitted, four minutes after now so a
//                           just-paused local item is older than this other-device row. The
//                           server accepts client timestamps up to five minutes in the future.

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
const QUEUE_ID_TEXT = optional(
  typeof E2E_QUEUE_ID_TEXT !== 'undefined' ? E2E_QUEUE_ID_TEXT : null,
  'e2ePodQueue01'
);
const ITEM_ID_TEXT = optional(
  typeof E2E_ITEM_ID_TEXT !== 'undefined' ? E2E_ITEM_ID_TEXT : null,
  ''
);
const PLAYBACK_POSITION = optional(
  typeof E2E_PLAYBACK_POSITION !== 'undefined' ? E2E_PLAYBACK_POSITION : null,
  '0'
);
const PLAYBACK_EVENT_KIND = optional(
  typeof E2E_PLAYBACK_EVENT_KIND !== 'undefined' ? E2E_PLAYBACK_EVENT_KIND : null,
  'play'
);
const NEWER_THAN_LOCAL_MS = 4 * 60 * 1000;
const LAST_PLAYED_AT = optional(
  typeof E2E_LAST_PLAYED_AT !== 'undefined' ? E2E_LAST_PLAYED_AT : null,
  new Date(Date.now() + NEWER_THAN_LOCAL_MS).toISOString()
);

if (ITEM_ID_TEXT.length === 0) {
  throw new Error('seed-playback-now-playing: E2E_ITEM_ID_TEXT is required');
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

const postJson = (url, body, headers) =>
  http.post(url, {
    headers: headers ? Object.assign({}, JSON_HEADERS, headers) : JSON_HEADERS,
    body: JSON.stringify(body),
  });

const failOn = (label, response) => {
  if (!response.ok) {
    throw new Error(
      `seed-playback-now-playing: ${label} failed (${response.status}) ${response.body}`
    );
  }
};

// The mobile token endpoint returns the access token in the response body by design, unlike
// cookie-based web login, which withholds it unless the API is explicitly configured otherwise.
const tokenResponse = postJson(`${API_BASE_URL}/auth/mobile/token`, {
  email: LOGIN_EMAIL,
  password: LOGIN_PASSWORD,
});
failOn('mobile token', tokenResponse);

const accessToken = json(tokenResponse.body).access_token;
if (typeof accessToken !== 'string' || accessToken.length === 0) {
  throw new Error('seed-playback-now-playing: mobile token response had no access_token');
}

const authHeaders = { Authorization: `Bearer ${accessToken}` };
const seedBody = {
  last_played_at: LAST_PLAYED_AT,
  playback_event_kind: PLAYBACK_EVENT_KIND,
  playback_position: Number(PLAYBACK_POSITION),
};
const nowPlayingUrl = `${API_BASE_URL}/queue/${QUEUE_ID_TEXT}/resources/now-playing`;

const readNowPlayingItemIdText = (body) => {
  const parsed = json(body);
  const resource = Array.isArray(parsed) ? parsed[0] : parsed;
  const idText = resource && resource.item && resource.item.id_text;
  return typeof idText === 'string' ? idText : '';
};

// A just-paused device may still be posting episode A. Write B and reread until the
// server row matches, so remount reconcile sees the other-device item.
let confirmed = false;
for (let attempt = 0; attempt < 8; attempt += 1) {
  const seedResponse = postJson(
    `${API_BASE_URL}/queue/${QUEUE_ID_TEXT}/item/${ITEM_ID_TEXT}/now-playing`,
    seedBody,
    authHeaders
  );
  failOn(`now-playing seed for ${ITEM_ID_TEXT}`, seedResponse);

  const current = http.get(nowPlayingUrl, { headers: authHeaders });
  failOn(`now-playing read for ${ITEM_ID_TEXT}`, current);
  if (readNowPlayingItemIdText(current.body) === ITEM_ID_TEXT) {
    confirmed = true;
    break;
  }
}

if (!confirmed) {
  throw new Error(
    `seed-playback-now-playing: server now-playing was not ${ITEM_ID_TEXT} after retries`
  );
}
