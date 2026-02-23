import express from 'express';
import { readFileSync, existsSync } from 'fs';
import https from 'https';

const app = express();
const PORT = process.env.PORT || 3003;
const DOMAIN = process.env.DOMAIN || 'localhost:3003';

// Default LND config (main Nigiri LND, used for unrecognized usernames)
const DEFAULT_LND = {
  host: process.env.LND_REST_HOST || 'host.docker.internal',
  port: process.env.LND_REST_PORT || '8080',
  macaroonPath: process.env.LND_MACAROON_PATH || '/lnd-creds/admin.macaroon',
  tlsPath: process.env.LND_TLS_CERT_PATH || '/lnd-creds/tls.cert',
};

// Per-username routing: alice/bob/fee each have their own LND node.
// Credentials are mounted from named volumes (see docker-compose.yml).
// Macaroon path inside the volume: data/chain/bitcoin/regtest/admin.macaroon
// TLS cert path inside the volume: tls.cert
const USER_LND_MAP = {
  alice: {
    host: process.env.ALICE_LND_REST_HOST || 'podverse_local_lnd_alice',
    port: process.env.ALICE_LND_REST_PORT || '8080',
    macaroonPath: '/alice-creds/data/chain/bitcoin/regtest/admin.macaroon',
    tlsPath: '/alice-creds/tls.cert',
  },
  bob: {
    host: process.env.BOB_LND_REST_HOST || 'podverse_local_lnd_bob',
    port: process.env.BOB_LND_REST_PORT || '8080',
    macaroonPath: '/bob-creds/data/chain/bitcoin/regtest/admin.macaroon',
    tlsPath: '/bob-creds/tls.cert',
  },
  fee: {
    host: process.env.FEE_LND_REST_HOST || 'podverse_local_lnd_fee',
    port: process.env.FEE_LND_REST_PORT || '8080',
    macaroonPath: '/fee-creds/data/chain/bitcoin/regtest/admin.macaroon',
    tlsPath: '/fee-creds/tls.cert',
  },
};

// Cache of loaded credentials per user (lazy-loaded per request)
const credCache = {};

function loadLndCredentials(username) {
  if (credCache[username]) {
    return credCache[username];
  }

  const config = USER_LND_MAP[username] ?? DEFAULT_LND;

  let macaroonHex = null;
  let tlsCert = null;

  try {
    if (existsSync(config.macaroonPath)) {
      macaroonHex = readFileSync(config.macaroonPath).toString('hex');
      console.log(`[${username}] Loaded LND macaroon from ${config.macaroonPath}`);
    } else {
      console.warn(`[${username}] Macaroon not found at ${config.macaroonPath}`);
    }

    if (existsSync(config.tlsPath)) {
      tlsCert = readFileSync(config.tlsPath);
      console.log(`[${username}] Loaded LND TLS cert from ${config.tlsPath}`);
    } else {
      console.warn(`[${username}] TLS cert not found at ${config.tlsPath}`);
    }
  } catch (err) {
    console.error(`[${username}] Failed to load LND credentials:`, err.message);
  }

  const creds = { config, macaroonHex, tlsCert };
  if (macaroonHex !== null) {
    credCache[username] = creds;
  }
  return creds;
}

// Pre-load credentials for known users and default at startup
function preloadCredentials() {
  for (const username of Object.keys(USER_LND_MAP)) {
    loadLndCredentials(username);
  }
  // Also pre-load default (used for unknown usernames)
  loadLndCredentials('__default__');
}

function getLndCredsForUser(username) {
  const creds = loadLndCredentials(username);
  if (creds.macaroonHex !== null) {
    return creds;
  }
  // Fall back to default LND if user-specific creds are unavailable
  const defaultCreds = loadLndCredentials('__default__');
  console.warn(`[${username}] Falling back to default LND`);
  return defaultCreds;
}

async function createInvoice(username, amountMsat, memo) {
  const { config, macaroonHex, tlsCert } = getLndCredsForUser(username);

  if (!macaroonHex) {
    throw new Error(`No macaroon available for ${username}`);
  }

  return new Promise((resolve, reject) => {
    const amountSat = Math.floor(amountMsat / 1000);
    const data = JSON.stringify({ value: amountSat, memo });

    const options = {
      hostname: config.host,
      port: config.port,
      path: '/v1/invoices',
      method: 'POST',
      headers: {
        'Grpc-Metadata-macaroon': macaroonHex,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
      rejectUnauthorized: false,
    };

    if (tlsCert) {
      options.ca = tlsCert;
    }

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (result.payment_request) {
            resolve(result.payment_request);
          } else {
            reject(new Error(result.message || 'Failed to create invoice'));
          }
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// CORS — allow browser fetches from localhost:3000 (and any other origin in local dev)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

app.get('/', (req, res) => {
  res.json({
    service: 'podverse-local-lnurl-server',
    domain: DOMAIN,
    health: `http://${DOMAIN}/health`,
    lnurlpExample: `http://${DOMAIN}/.well-known/lnurlp/alice`,
    knownUsers: Object.keys(USER_LND_MAP),
  });
});

app.get('/health', (req, res) => {
  const defaultCreds = loadLndCredentials('__default__');
  res.json({
    status: 'ok',
    service: 'podverse-local-lnurl-server',
    lndConnected: defaultCreds.macaroonHex !== null,
  });
});

app.get('/.well-known/lnurlp/:username', (req, res) => {
  const { username } = req.params;
  const minSendable = 1000;
  const maxSendable = 100000000000;

  const metadata = JSON.stringify([
    ['text/plain', `Payment to ${username}@${DOMAIN}`],
    ['text/identifier', `${username}@${DOMAIN}`],
  ]);

  res.json({
    callback: `http://${DOMAIN}/lnurlp/${username}/callback`,
    minSendable,
    maxSendable,
    metadata,
    tag: 'payRequest',
    commentAllowed: 255,
  });
});

app.get('/lnurlp/:username/callback', async (req, res) => {
  const { username } = req.params;
  const { amount, comment } = req.query;

  if (!amount) {
    return res.status(400).json({ status: 'ERROR', reason: 'Missing amount parameter' });
  }

  const amountMsat = parseInt(amount, 10);
  if (isNaN(amountMsat) || amountMsat <= 0) {
    return res.status(400).json({ status: 'ERROR', reason: 'Invalid amount' });
  }

  try {
    const memo = comment || `Payment to ${username}@${DOMAIN}`;
    const invoice = await createInvoice(username, amountMsat, memo);

    res.json({
      pr: invoice,
      routes: [],
    });
  } catch (err) {
    console.error(`[${username}] Failed to create invoice:`, err.message);
    res.status(500).json({ status: 'ERROR', reason: 'Failed to create invoice' });
  }
});

preloadCredentials();

app.listen(PORT, () => {
  console.log(`LNURL server listening on port ${PORT}`);
  console.log(`Lightning Addresses: *@${DOMAIN}`);
  console.log(`Default LND REST: https://${DEFAULT_LND.host}:${DEFAULT_LND.port}`);
  console.log(`Per-user routing: ${Object.keys(USER_LND_MAP).join(', ')}`);
});
