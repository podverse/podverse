import fs from 'fs';
import http from 'http';
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

import {
  BASIC_AUTH_SUBDIR,
  BASIC_AUTH_TEST_PASSWORD,
  BASIC_AUTH_TEST_USERNAME,
} from './constants.js';

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

        fs.stat(normalizedPath, (err, stats) => {
          if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File not found');
            return;
          }

          const mimeType = this.getMimeType(normalizedPath, normalizedPath);
          const ext = path.extname(normalizedPath).toLowerCase();
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
            const stream = fs.createReadStream(normalizedPath, { start, end });
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
          const stream = fs.createReadStream(normalizedPath);
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
