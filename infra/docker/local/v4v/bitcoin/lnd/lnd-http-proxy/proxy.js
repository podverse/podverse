'use strict';
/**
 * Plain HTTP proxy that forwards all requests to LND's HTTPS REST API.
 * Injects the admin macaroon automatically so callers need no TLS or auth setup.
 *
 * Inside the container, LND credentials are always mounted at /lnd-creds/.
 *
 * Environment variables:
 *   PORT               HTTP port to listen on (default: 8181)
 *   LND_REST_HOST      LND REST hostname (default: host.docker.internal)
 *   LND_REST_PORT      LND REST HTTPS port (default: 18080)
 *   LND_MACAROON_PATH  Path to admin.macaroon (default: /lnd-creds/admin.macaroon)
 *   LND_TLS_CERT_PATH  Path to tls.cert (default: /lnd-creds/tls.cert; set to "" to skip)
 *   INJECT_MACAROON    Inject macaroon header on every request (default: true)
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const url = require('url');

const PORT = parseInt(process.env.PORT || '8181', 10);
const LND_REST_HOST = process.env.LND_REST_HOST || 'host.docker.internal';
const LND_REST_PORT = parseInt(process.env.LND_REST_PORT || '18080', 10);
const INJECT_MACAROON = (process.env.INJECT_MACAROON ?? 'true') !== 'false';
const LND_MACAROON_PATH = process.env.LND_MACAROON_PATH || '/lnd-creds/admin.macaroon';
const LND_TLS_CERT_PATH =
  process.env.LND_TLS_CERT_PATH !== undefined
    ? process.env.LND_TLS_CERT_PATH
    : '/lnd-creds/tls.cert';

function loadFile(filePath, label) {
  if (!filePath) return null;
  try {
    const data = fs.readFileSync(filePath);
    console.log(`Loaded ${label}: ${filePath}`);
    return data;
  } catch (err) {
    console.warn(`Warning: could not load ${label} at ${filePath}: ${err.message}`);
    return null;
  }
}

const macaroonBuf = INJECT_MACAROON ? loadFile(LND_MACAROON_PATH, 'macaroon') : null;
const macaroonHex = macaroonBuf ? macaroonBuf.toString('hex') : null;
const tlsCert = loadFile(LND_TLS_CERT_PATH, 'TLS cert');

const server = http.createServer((clientReq, clientRes) => {
  const parsedUrl = url.parse(clientReq.url || '/');
  const targetPath = parsedUrl.path || '/';

  const forwardHeaders = Object.assign({}, clientReq.headers);
  delete forwardHeaders['host'];

  if (macaroonHex) {
    forwardHeaders['Grpc-Metadata-macaroon'] = macaroonHex;
  }

  const options = {
    hostname: LND_REST_HOST,
    port: LND_REST_PORT,
    path: targetPath,
    method: clientReq.method,
    headers: forwardHeaders,
    rejectUnauthorized: false,
  };

  const logLine = `${clientReq.method} ${targetPath}`;

  const proxyReq = https.request(options, (proxyRes) => {
    console.log(`${logLine} -> ${proxyRes.statusCode}`);
    clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(clientRes, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error(`${logLine} -> proxy error: ${err.message}`);
    if (!clientRes.headersSent) {
      clientRes.writeHead(502);
    }
    clientRes.end(JSON.stringify({ error: 'Bad Gateway', message: err.message }));
  });

  clientReq.pipe(proxyReq, { end: true });
});

server.listen(PORT, () => {
  console.log(`lnd-http-proxy listening on http://localhost:${PORT}`);
  console.log(`Forwarding to https://${LND_REST_HOST}:${LND_REST_PORT}`);
  console.log(`Macaroon injection: ${macaroonHex ? 'enabled' : 'disabled (macaroon not loaded)'}`);
  console.log(
    'TLS verification: disabled (rejectUnauthorized=false; self-signed cert on dev host bridge)'
  );
  console.log('');
  console.log('Examples:');
  console.log(`  curl http://localhost:${PORT}/v1/getinfo`);
  console.log(`  curl http://localhost:${PORT}/v1/balance/channels`);
});
