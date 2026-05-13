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

        // Check if file exists
        fs.stat(normalizedPath, (err, stats) => {
          if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File not found');
            return;
          }

          // Read and serve file
          fs.readFile(normalizedPath, (err, data) => {
            if (err) {
              res.writeHead(500, { 'Content-Type': 'text/plain' });
              res.end('Internal server error');
              return;
            }

            const mimeType = this.getMimeType(normalizedPath, normalizedPath);
            const ext = path.extname(normalizedPath).toLowerCase();
            const headers: Record<string, string> = {
              'Content-Type': mimeType,
              'Content-Length': String(data.length),
            };
            if (ext === '.rss' || ext === '.xml') {
              headers['Content-Disposition'] = 'inline';
            }
            res.writeHead(200, headers);
            res.end(data);
          });
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
