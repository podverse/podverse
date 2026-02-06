import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES modules __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ASSET_PORT = 2111;

export class AssetServer {
  private server: http.Server | null = null;
  private assetsDir: string;

  constructor() {
    // Assets directory is tools/test-assets/assets/
    this.assetsDir = path.join(__dirname, '../assets');
  }

  getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.mp3':
        return 'audio/mpeg';
      case '.mp4':
        return 'video/mp4';
      case '.rss':
        return 'application/xml';
      case '.xml':
        return 'text/xml';
      default:
        return 'application/octet-stream';
    }
  }

  async start(): Promise<void> {
    if (this.server) {
      throw new Error('Asset server is already running');
    }

    // Ensure assets directory exists
    if (!fs.existsSync(this.assetsDir)) {
      throw new Error(`Assets directory does not exist: ${this.assetsDir}`);
    }

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

        // Parse requested file path (strip leading slash so path.join stays under assetsDir)
        const rawPath = req.url === '/' ? '/index.html' : req.url || '/';
        const urlPath = rawPath.startsWith('/') ? rawPath.slice(1) : rawPath;
        const filePath = path.join(this.assetsDir, urlPath);

        // Security: prevent directory traversal
        const normalizedPath = path.normalize(filePath);
        if (!normalizedPath.startsWith(this.assetsDir)) {
          res.writeHead(403, { 'Content-Type': 'text/plain' });
          res.end('Forbidden');
          return;
        }

        // Check if file exists
        fs.stat(filePath, (err, stats) => {
          if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File not found');
            return;
          }

          // Read and serve file
          fs.readFile(filePath, (err, data) => {
            if (err) {
              res.writeHead(500, { 'Content-Type': 'text/plain' });
              res.end('Internal server error');
              return;
            }

            const mimeType = this.getMimeType(filePath);
            const ext = path.extname(filePath).toLowerCase();
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

      this.server.listen(ASSET_PORT, 'localhost', () => {
        console.log(`   ✅ Asset server started on http://localhost:${ASSET_PORT}`);
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
