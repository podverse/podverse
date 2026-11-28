import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ensureAuthenticated } from '@management-api/lib/auth/index.js';
import type { Express, Request, Response } from 'express';

const require = createRequire(import.meta.url);

const SWAGGER_UI_FILES = [
  'swagger-ui.css',
  'swagger-ui-bundle.js',
  'swagger-ui.css.map',
  'swagger-ui-bundle.js.map',
] as const;

function resolveOpenApiPath(): string {
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFile);
  const fallbackPath = path.resolve(process.cwd(), 'apps/management-api/openapi.yml');
  const candidates = [
    path.resolve(currentDir, '../../../openapi.yml'),
    path.resolve(process.cwd(), 'openapi.yml'),
    fallbackPath,
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return fallbackPath;
}

function swaggerUiDistDir(): string {
  return path.dirname(require.resolve('swagger-ui-dist/package.json'));
}

/** These files are the Swagger UI build. The page and `/docs.yaml` require a session. */
function registerSwaggerUiAssets(app: Express, assetsBase: string): void {
  const distDir = swaggerUiDistDir();
  for (const fileName of SWAGGER_UI_FILES) {
    app.get(`${assetsBase}/${fileName}`, (_req: Request, res: Response) => {
      res.sendFile(fileName, { root: distDir }, (error) => {
        if (error && !res.headersSent) {
          res.status(404).type('text/plain').send('Not found');
        }
      });
    });
  }
}

function getSwaggerHtml(specUrl: string, assetsBase: string, title: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <link rel="stylesheet" href="${assetsBase}/swagger-ui.css" />
    <style>
      body { margin: 0; background: #f7f7f8; }
      #swagger-ui { max-width: 1200px; margin: 0 auto; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="${assetsBase}/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '${specUrl}',
        dom_id: '#swagger-ui',
        deepLinking: true,
        docExpansion: 'none',
        presets: [SwaggerUIBundle.presets.apis],
      });
    </script>
  </body>
</html>`;
}

export function registerSwaggerDocs(app: Express, baseUrl: string): void {
  const openApiPath = resolveOpenApiPath();
  const assetsBase = `${baseUrl}/docs/assets`;
  registerSwaggerUiAssets(app, assetsBase);

  app.get(`${baseUrl}/docs.yaml`, ensureAuthenticated, (_req: Request, res: Response) => {
    try {
      const yaml = fs.readFileSync(openApiPath, 'utf8');
      res.type('application/yaml').send(yaml);
    } catch {
      res.status(500).json({ message: 'Failed to load OpenAPI spec' });
    }
  });

  app.get(`${baseUrl}/docs`, ensureAuthenticated, (_req: Request, res: Response) => {
    res
      .type('text/html')
      .send(getSwaggerHtml(`${baseUrl}/docs.yaml`, assetsBase, 'Podverse Management API Docs'));
  });
}
