import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { registerSwaggerDocs } from './registerSwaggerDocs.js';

const API_BASE = '/api/v2';

const pageRequiredPaths = [
  '/profile/{account_id_text}/podcasts/az',
  '/profile/{account_id_text}/albums/az',
  '/profile/{account_id_text}/playlists/az',
  '/profile/{account_id_text}/clips/recent',
  '/my-profile/podcasts/az',
  '/my-profile/albums/az',
  '/my-profile/playlists/az',
  '/my-profile/clips/recent',
  '/playlist/private/az',
  '/playlist/private/oldest',
  '/playlist/private/recent',
  '/playlist/private/top',
  '/playlist/private/followed/az',
  '/playlist/private/followed/oldest',
  '/playlist/private/followed/recent',
  '/playlist/private/followed/top',
  '/playlist/public/recent',
  '/playlist/public/top',
  '/account/recent',
  '/account/subscribed/az',
  '/account/subscribed/recent',
  '/account/top',
  '/account/subscribed/top',
  '/item/channel/season/backward/{channel_id_or_id_text}',
  '/item/channel/season/forward/{channel_id_or_id_text}',
  '/item/channel/shuffle/{channel_id_or_id_text}',
  '/channel/category/recent',
  '/channel/category/top',
  '/channel/global/recent',
  '/channel/global/top',
  '/channel/subscribed/az',
  '/channel/subscribed/recent',
  '/channel/subscribed/top',
  '/clip/public/category/oldest',
  '/clip/public/category/recent',
  '/clip/public/category/top',
  '/clip/public/channel/oldest/{channel_id_text}',
  '/clip/public/channel/recent/{channel_id_text}',
  '/clip/public/channel/top/{channel_id_text}',
  '/clip/public/item/oldest/{item_id_text}',
  '/clip/public/item/recent/{item_id_text}',
  '/clip/public/item/top/{item_id_text}',
  '/clip/public/oldest',
  '/clip/public/recent',
  '/clip/public/subscribed/recent',
  '/clip/public/subscribed/top',
  '/clip/public/top',
  '/item/category/recent',
  '/item/category/top',
  '/item/channel/oldest/{channel_id_or_id_text}',
  '/item/channel/recent/{channel_id_or_id_text}',
  '/item/channel/top/{channel_id_or_id_text}',
  '/item/global/recent',
  '/item/global/top',
  '/item/subscribed/recent',
  '/item/subscribed/top',
  '/live-item/category/recent',
  '/live-item/category/top',
  '/live-item/global/recent',
  '/live-item/global/top',
  '/live-item/subscribed/recent',
  '/live-item/subscribed/top',
  '/live-item/global/upcoming',
  '/live-item/subscribed/upcoming',
];

const pageOptionalRefPaths = [
  '/playlist/{playlist_id_text}/resources',
  '/playlist/{playlist_id_text}/resources/shuffle',
  '/queue/{queue_id_text}/resources/history-paginated',
];

const pageOptionalInlinePaths = [
  '/account/channel-seen',
  '/account/channel-seen/add-by-rss',
  '/account/taste-profile',
  '/account/taste-profile/hidden',
  '/account/notifications',
];

const pageOmittedPaths = [
  '/item-soundbite/channel/{channel_id_text}',
  '/item-soundbite/item/{item_id_text}',
];

const publicProcessPaths = ['/', '/health', '/health/ready', '/meta', '/docs', '/docs.yaml'];

const METHOD_LINE = /^ {4}(get|post|put|patch|delete|options|head):$/;
const PATH_LINE = /^ {2}\/.*:$/;

function readOpenApiSpec(): string {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const specPath = path.resolve(currentDir, '../../../openapi.yml');
  return fs.readFileSync(specPath, 'utf8');
}

function operationText(spec: string, routePath: string): string {
  const lines = spec.split('\n');
  const pathLine = `  ${routePath}:`;
  const pathIndexes: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === pathLine) {
      pathIndexes.push(i);
    }
  }
  if (pathIndexes.length !== 1) {
    throw new Error(`expected one path line for ${routePath}, found ${pathIndexes.length}`);
  }

  const pathIndex = pathIndexes[0];
  let nextPath = lines.length;
  for (let i = pathIndex + 1; i < lines.length; i++) {
    if (PATH_LINE.test(lines[i])) {
      nextPath = i;
      break;
    }
  }

  let methodIndex = -1;
  for (let i = pathIndex + 1; i < nextPath; i++) {
    if (lines[i] === '    get:') {
      methodIndex = i;
      break;
    }
  }
  if (methodIndex < 0) {
    throw new Error(`no get operation for ${routePath}`);
  }

  let end = nextPath;
  for (let i = methodIndex + 1; i < nextPath; i++) {
    if (METHOD_LINE.test(lines[i])) {
      end = i;
      break;
    }
  }

  return lines.slice(methodIndex, end).join('\n');
}

describe('registerSwaggerDocs', () => {
  it('serves the OpenAPI document and the HTML page that loads it', async () => {
    const app = express();
    registerSwaggerDocs(app, API_BASE);

    const yamlResponse = await request(app).get(`${API_BASE}/docs.yaml`).expect(200);
    expect(yamlResponse.headers['content-type']).toContain('application/yaml');
    const servedNeedles = [
      'operationId: apiGetRoot',
      '/health/ready',
      '/meta:',
      '/docs.yaml:',
      '/my-profile/podcasts/az',
      '/my-profile/albums/az',
      '/my-profile/playlists/az',
      '/my-profile/clips/recent',
    ];
    const missingFromYaml = servedNeedles.filter((needle) => !yamlResponse.text.includes(needle));
    expect(missingFromYaml).toEqual([]);

    const htmlResponse = await request(app).get(`${API_BASE}/docs`).expect(200);
    expect(htmlResponse.headers['content-type']).toContain('text/html');
    expect(htmlResponse.text).toContain(`${API_BASE}/docs.yaml`);
  });

  it('documents required list pages and the public process routes', () => {
    const spec = readOpenApiSpec();
    const failures: string[] = [];

    for (const routePath of pageRequiredPaths) {
      const operation = operationText(spec, routePath);
      if (!operation.includes('#/components/parameters/PageQueryRequired')) {
        failures.push(`${routePath} is missing PageQueryRequired`);
      }
      if (operation.includes('PageQueryOptional')) {
        failures.push(`${routePath} still references PageQueryOptional`);
      }
    }

    for (const routePath of ['/account/top', '/account/subscribed/top']) {
      const operation = operationText(spec, routePath);
      if (!operation.includes('#/components/parameters/StatsRangeQueryRequired')) {
        failures.push(`${routePath} is missing StatsRangeQueryRequired`);
      }
    }

    const shuffle = operationText(spec, '/item/channel/shuffle/{channel_id_or_id_text}');
    if (!shuffle.includes('name: shuffleHash') || !shuffle.includes('required: true')) {
      failures.push('shuffle is missing required shuffleHash');
    }

    for (const routePath of pageOptionalRefPaths) {
      const operation = operationText(spec, routePath);
      if (!operation.includes('#/components/parameters/PageQueryOptional')) {
        failures.push(`${routePath} is missing PageQueryOptional`);
      }
      if (operation.includes('PageQueryRequired')) {
        failures.push(`${routePath} references PageQueryRequired`);
      }
    }

    const optionalPage = ['- name: page', 'in: query', 'required: false'].join('\n          ');
    for (const routePath of pageOptionalInlinePaths) {
      const operation = operationText(spec, routePath);
      if (!operation.includes(optionalPage)) {
        failures.push(`${routePath} page parameter is not optional`);
      }
    }

    for (const routePath of pageOmittedPaths) {
      const operation = operationText(spec, routePath);
      if (operation.includes('name: page') || operation.includes('PageQuery')) {
        failures.push(`${routePath} documents page`);
      }
    }

    for (const routePath of publicProcessPaths) {
      const operation = operationText(spec, routePath);
      if (!operation.includes('security: []')) {
        failures.push(`${routePath} is missing security: []`);
      }
      if (operation.includes('apiKeyAuth')) {
        failures.push(`${routePath} documents apiKeyAuth`);
      }
    }

    const ready = operationText(spec, '/health/ready');
    if (!ready.includes('"503"')) {
      failures.push('/health/ready is missing 503');
    }
    if (!operationText(spec, '/docs.yaml').includes('application/yaml')) {
      failures.push('/docs.yaml is missing application/yaml');
    }
    if (!operationText(spec, '/docs').includes('text/html')) {
      failures.push('/docs is missing text/html');
    }

    expect(failures).toEqual([]);
  });
});
