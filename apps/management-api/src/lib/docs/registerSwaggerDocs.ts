import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Express, Request, Response } from 'express';

function resolveOpenApiPath(): string {
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFile);
  const fallbackPath = path.resolve(process.cwd(), 'apps/management-api/openapi.yml');
  const candidates = [path.resolve(currentDir, '../../openapi.yml'), fallbackPath];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return fallbackPath;
}

function getSwaggerHtml(specUrl: string, title: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      body { margin: 0; background: #f7f7f8; }
      #swagger-ui { max-width: 1200px; margin: 0 auto; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
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

  app.get(`${baseUrl}/docs.yaml`, (_req: Request, res: Response) => {
    try {
      const yaml = fs.readFileSync(openApiPath, 'utf8');
      res.type('application/yaml').send(yaml);
    } catch {
      res.status(500).json({ message: 'Failed to load OpenAPI spec' });
    }
  });

  app.get(`${baseUrl}/docs`, (_req: Request, res: Response) => {
    res
      .type('text/html')
      .send(getSwaggerHtml(`${baseUrl}/docs.yaml`, 'Podverse Management API Docs'));
  });
}
