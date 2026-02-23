import express from 'express';
import { readFileSync, existsSync } from 'fs';
import https from 'https';

const app = express();
const PORT = process.env.PORT || 3003;
const DOMAIN = process.env.DOMAIN || 'localhost:3003';

const LND_REST_HOST = process.env.LND_REST_HOST || 'host.docker.internal';
const LND_REST_PORT = process.env.LND_REST_PORT || '8080';
const LND_MACAROON_PATH = process.env.LND_MACAROON_PATH || '/lnd-creds/admin.macaroon';
const LND_TLS_CERT_PATH = process.env.LND_TLS_CERT_PATH || '/lnd-creds/tls.cert';

let macaroonHex = null;
let tlsCert = null;

function loadLndCredentials() {
  try {
    if (existsSync(LND_MACAROON_PATH)) {
      const macaroon = readFileSync(LND_MACAROON_PATH);
      macaroonHex = macaroon.toString('hex');
      console.log('Loaded LND macaroon');
    } else {
      console.warn(`Macaroon not found at ${LND_MACAROON_PATH}, LND calls will fail`);
    }

    if (existsSync(LND_TLS_CERT_PATH)) {
      tlsCert = readFileSync(LND_TLS_CERT_PATH);
      console.log('Loaded LND TLS cert');
    } else {
      console.warn(`TLS cert not found at ${LND_TLS_CERT_PATH}, using insecure mode`);
    }
  } catch (err) {
    console.error('Failed to load LND credentials:', err.message);
  }
}

async function createInvoice(amountMsat, memo) {
  return new Promise((resolve, reject) => {
    const amountSat = Math.floor(amountMsat / 1000);
    const data = JSON.stringify({ value: amountSat, memo });

    const options = {
      hostname: LND_REST_HOST,
      port: LND_REST_PORT,
      path: '/v1/invoices',
      method: 'POST',
      headers: {
        'Grpc-Metadata-macaroon': macaroonHex,
        'Content-Type': 'application/json',
        'Content-Length': data.length,
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

app.get('/', (req, res) => {
  res.json({
    service: 'podverse-local-lnurl-server',
    domain: DOMAIN,
    health: `http://${DOMAIN}/health`,
    lnurlpExample: `http://${DOMAIN}/.well-known/lnurlp/alice`,
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'podverse-local-lnurl-server',
    lndConnected: macaroonHex !== null,
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
    const invoice = await createInvoice(amountMsat, memo);

    res.json({
      pr: invoice,
      routes: [],
    });
  } catch (err) {
    console.error('Failed to create invoice:', err.message);
    res.status(500).json({ status: 'ERROR', reason: 'Failed to create invoice' });
  }
});

loadLndCredentials();

app.listen(PORT, () => {
  console.log(`LNURL server listening on port ${PORT}`);
  console.log(`Lightning Addresses: *@${DOMAIN}`);
  console.log(`LND REST: https://${LND_REST_HOST}:${LND_REST_PORT}`);
});
