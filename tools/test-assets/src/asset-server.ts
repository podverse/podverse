import fs from 'fs';
import http from 'http';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

import {
  AUTHORIZATION_PROBE_PATH,
  BASIC_AUTH_BASE_URL,
  BASIC_AUTH_PUBLIC_MEDIA_SUBDIR,
  BASIC_AUTH_SUBDIR,
  BASIC_AUTH_TEST_PASSWORD,
  BASIC_AUTH_TEST_USERNAME,
  BASIC_AUTH_VARIANTS_SUBPATH,
  DEFAULT_ASSETS_BASE_URL,
  OTHER_HOST_ASSETS_BASE_URL,
  REDIRECT_OTHER_HOST_PREFIX,
} from './constants.js';
import { BASIC_AUTH_FEED_FILENAME } from './generate-feed-constants.js';

// ES modules __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ASSET_PORT = 2111;
/** Bind address (default localhost). Set to 0.0.0.0 when running in Docker so other containers can reach the server. */
const BIND_ADDRESS = process.env.BIND_ADDRESS ?? 'localhost';

function parseBasicAuth(
  authHeader: string | undefined
): { username: string; password: string } | null {
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return null;
  }
  try {
    const encoded = authHeader.slice(6).trim();
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const colonIndex = decoded.indexOf(':');
    if (colonIndex === -1) return null;
    return {
      username: decoded.slice(0, colonIndex),
      password: decoded.slice(colonIndex + 1),
    };
  } catch {
    return null;
  }
}

const BASIC_AUTH_FEED_VARIANTS = {
  'feed-public-media.rss': {
    label: 'public media',
    resourceBaseUrl: `${DEFAULT_ASSETS_BASE_URL}/${BASIC_AUTH_PUBLIC_MEDIA_SUBDIR}/`,
  },
  'feed-other-host-media.rss': {
    label: 'other-host media',
    resourceBaseUrl: `${OTHER_HOST_ASSETS_BASE_URL}/${BASIC_AUTH_SUBDIR}/`,
  },
} as const;

type BasicAuthFeedVariantName = keyof typeof BASIC_AUTH_FEED_VARIANTS;

const isBasicAuthFeedVariantName = (value: string): value is BasicAuthFeedVariantName =>
  Object.prototype.hasOwnProperty.call(BASIC_AUTH_FEED_VARIANTS, value);

/**
 * Rewrites the base basic-auth feed so every resource URL points at `resourceBaseUrl`, and tags
 * the channel title so the variant is recognizable in a feed list.
 */
function buildBasicAuthFeedVariant(xml: string, variant: BasicAuthFeedVariantName): string {
  const { label, resourceBaseUrl } = BASIC_AUTH_FEED_VARIANTS[variant];
  const rewritten = xml.split(`${BASIC_AUTH_BASE_URL}/`).join(resourceBaseUrl);
  const channelTitle = /<title>([^<]*)<\/title>/.exec(rewritten)?.[1];
  if (channelTitle === undefined) {
    return rewritten;
  }
  return rewritten
    .split(`<title>${channelTitle}</title>`)
    .join(`<title>${channelTitle} (${label})</title>`);
}

/** The loopback host a redirect should move to: the one the request did not use. */
function otherLoopbackHost(hostHeader: string | undefined): string {
  const override = process.env.REDIRECT_OTHER_HOST;
  if (override !== undefined && override !== '') {
    return override;
  }
  const requestHost = (hostHeader ?? '').replace(/:\d+$/, '');
  return requestHost === '127.0.0.1' ? 'localhost' : '127.0.0.1';
}

export class AssetServer {
  private server: http.Server | null = null;
  private assetsDir: string;

  constructor() {
    // Assets directory is tools/test-assets/assets/
    this.assetsDir = path.join(__dirname, '../assets');
  }

  getMimeType(filename: string, filePath?: string): string {
    const ext = path.extname(filename).toLowerCase();
    if (ext === '.json' && filePath && filePath.includes(path.sep + 'chapters' + path.sep)) {
      return 'application/json+chapters';
    }
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.png':
        return 'image/png';
      case '.mp3':
        return 'audio/mpeg';
      case '.mp4':
        return 'video/mp4';
      case '.ogg':
        return 'audio/ogg';
      case '.webm':
        return 'video/webm';
      case '.rss':
        return 'application/xml';
      case '.xml':
        return 'text/xml';
      case '.json':
        return 'application/json';
      case '.vtt':
        return 'text/vtt';
      case '.srt':
        return 'application/x-subrip';
      case '.txt':
        return 'text/plain';
      case '.m3u8':
        return 'application/vnd.apple.mpegurl';
      case '.ts':
        return 'video/mp2t';
      case '.html':
        return 'text/html';
      default:
        return 'application/octet-stream';
    }
  }

  async start(): Promise<void> {
    if (this.server) {
      throw new Error('Asset server is already running');
    }

    // Create assets directory on startup if it does not exist
    fs.mkdirSync(this.assetsDir, { recursive: true });

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        // Handle CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        // Parse requested file path (strip leading slash and query so path.join stays under assetsDir)
        const rawPath = req.url === '/' ? '/index.html' : req.url || '/';
        const pathname = path
          .normalize(
            (rawPath.includes('?') ? rawPath.slice(0, rawPath.indexOf('?')) : rawPath).replace(
              /^\//,
              ''
            )
          )
          .replace(/^\/+/, '');

        if (pathname === AUTHORIZATION_PROBE_PATH) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              authorization: req.headers.authorization === undefined ? 'absent' : 'present',
              host: req.headers.host ?? null,
            })
          );
          return;
        }

        const redirectPrefix = `${REDIRECT_OTHER_HOST_PREFIX}/`;
        if (pathname.startsWith(redirectPrefix)) {
          const query = rawPath.includes('?') ? rawPath.slice(rawPath.indexOf('?')) : '';
          const targetHost = otherLoopbackHost(req.headers.host);
          const targetPath = pathname.slice(redirectPrefix.length);
          const target = `http://${targetHost}:${ASSET_PORT}/${targetPath}${query}`;
          res.writeHead(302, { Location: target, 'Content-Type': 'text/plain' });
          res.end(`Redirecting to ${target}`);
          return;
        }

        const filePath = path.join(this.assetsDir, pathname);

        // Security: prevent directory traversal
        const normalizedPath = path.normalize(filePath);
        if (!normalizedPath.startsWith(this.assetsDir)) {
          res.writeHead(403, { 'Content-Type': 'text/plain' });
          res.end('Forbidden');
          return;
        }

        // Require HTTP Basic Auth for any path that resolves under basic-auth/
        const basicAuthDir = path.join(this.assetsDir, BASIC_AUTH_SUBDIR);
        const isBasicAuthPath =
          normalizedPath === basicAuthDir || normalizedPath.startsWith(basicAuthDir + path.sep);
        let servedPath = normalizedPath;

        // The public mirror serves basic-auth resources without auth, but never its feeds.
        const publicMediaPrefix = `${BASIC_AUTH_PUBLIC_MEDIA_SUBDIR}/`;
        if (pathname.startsWith(publicMediaPrefix)) {
          const mirrored = path.normalize(
            path.join(basicAuthDir, pathname.slice(publicMediaPrefix.length))
          );
          const isFeedPath = mirrored.startsWith(path.join(basicAuthDir, 'feeds') + path.sep);
          if (!mirrored.startsWith(basicAuthDir + path.sep) || isFeedPath) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File not found');
            return;
          }
          servedPath = mirrored;
        }

        if (isBasicAuthPath) {
          const creds = parseBasicAuth(req.headers.authorization);
          if (
            !creds ||
            creds.username !== BASIC_AUTH_TEST_USERNAME ||
            creds.password !== BASIC_AUTH_TEST_PASSWORD
          ) {
            res.writeHead(401, {
              'Content-Type': 'text/plain',
              'WWW-Authenticate': 'Basic realm="test-assets"',
            });
            res.end('Unauthorized');
            return;
          }
        }

        const variantPrefix = `${BASIC_AUTH_SUBDIR}/${BASIC_AUTH_VARIANTS_SUBPATH}/`;
        if (pathname.startsWith(variantPrefix)) {
          const variant = pathname.slice(variantPrefix.length);
          if (!isBasicAuthFeedVariantName(variant)) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File not found');
            return;
          }
          const baseFeedPath = path.join(basicAuthDir, 'feeds', BASIC_AUTH_FEED_FILENAME);
          fs.readFile(baseFeedPath, 'utf8', (err, xml) => {
            if (err) {
              res.writeHead(404, { 'Content-Type': 'text/plain' });
              res.end(`Base feed missing; run generate to create ${BASIC_AUTH_FEED_FILENAME}`);
              return;
            }
            res.writeHead(200, {
              'Content-Type': 'application/xml',
              'Content-Disposition': 'inline',
            });
            res.end(buildBasicAuthFeedVariant(xml, variant));
          });
          return;
        }

        fs.stat(servedPath, (err, stats) => {
          if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File not found');
            return;
          }

          const mimeType = this.getMimeType(servedPath, servedPath);
          const ext = path.extname(servedPath).toLowerCase();
          const totalSize = stats.size;
          const rangeHeader = req.headers.range;

          /**
           * Always advertise byte-range support. Browsers use this to know
           * the media is seekable; without it the audio element reports
           * `seekable = [0, 0]` and silently clamps every `currentTime`
           * assignment back to 0, which broke media-player E2E specs that
           * seek to clip / soundbite / chapter / resume positions.
           */
          const baseHeaders: Record<string, string> = {
            'Content-Type': mimeType,
            'Accept-Ranges': 'bytes',
          };
          if (ext === '.rss' || ext === '.xml') {
            baseHeaders['Content-Disposition'] = 'inline';
          }

          if (rangeHeader) {
            const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
            if (!match) {
              res.writeHead(416, {
                ...baseHeaders,
                'Content-Range': `bytes */${totalSize}`,
              });
              res.end();
              return;
            }
            const startStr = match[1] ?? '';
            const endStr = match[2] ?? '';
            let start: number;
            let end: number;
            if (startStr === '' && endStr === '') {
              res.writeHead(416, {
                ...baseHeaders,
                'Content-Range': `bytes */${totalSize}`,
              });
              res.end();
              return;
            }
            if (startStr === '') {
              const suffixLength = parseInt(endStr, 10);
              if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
                res.writeHead(416, {
                  ...baseHeaders,
                  'Content-Range': `bytes */${totalSize}`,
                });
                res.end();
                return;
              }
              start = Math.max(totalSize - suffixLength, 0);
              end = totalSize - 1;
            } else {
              start = parseInt(startStr, 10);
              end = endStr === '' ? totalSize - 1 : parseInt(endStr, 10);
            }
            if (
              !Number.isFinite(start) ||
              !Number.isFinite(end) ||
              start < 0 ||
              end >= totalSize ||
              start > end
            ) {
              res.writeHead(416, {
                ...baseHeaders,
                'Content-Range': `bytes */${totalSize}`,
              });
              res.end();
              return;
            }
            const chunkSize = end - start + 1;
            res.writeHead(206, {
              ...baseHeaders,
              'Content-Range': `bytes ${start}-${end}/${totalSize}`,
              'Content-Length': String(chunkSize),
            });
            const stream = fs.createReadStream(servedPath, { start, end });
            stream.on('error', () => {
              res.end();
            });
            stream.pipe(res);
            return;
          }

          res.writeHead(200, {
            ...baseHeaders,
            'Content-Length': String(totalSize),
          });
          const stream = fs.createReadStream(servedPath);
          stream.on('error', () => {
            res.end();
          });
          stream.pipe(res);
        });
      });

      this.server.listen(ASSET_PORT, BIND_ADDRESS, () => {
        console.log(`   ✅ Asset server started on http://${BIND_ADDRESS}:${ASSET_PORT}`);
        resolve();
      });

      this.server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          reject(new Error(`Port ${ASSET_PORT} is already in use`));
        } else {
          reject(error);
        }
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.server) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.server?.close((err) => {
        if (err) {
          reject(err);
        } else {
          this.server = null;
          console.log(`   ✅ Asset server stopped`);
          resolve();
        }
      });
    });
  }

  isRunning(): boolean {
    return this.server !== null;
  }

  getPort(): number {
    return ASSET_PORT;
  }
}
