import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import type { ApiKeyResource, CrudAction } from '@podverse/helpers';
import {
  API_KEY_RESOURCES,
  API_KEY_SUPPORTED_ACTIONS,
  apiKeyResourceSupportsAction,
  isCrudAction,
} from '@podverse/helpers';

const specPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../openapi.yml');

const METHOD_LINE = /^ {4}(get|post|put|patch|delete):$/;
const PATH_LINE = /^ {2}\/.*:$/;

type ApiKeyOperationRow = {
  method: string;
  path: string;
  resource: ApiKeyResource;
  action: CrudAction;
  optional: boolean;
};

const sectionCounts: Record<ApiKeyResource, number> = {
  account: 7,
  settings: 6,
  subscriptions: 33,
  add_by_rss: 11,
  playlists: 31,
  queue: 32,
  history: 7,
  clips: 5,
  notifications: 33,
};

const unsupportedCells: ReadonlyArray<readonly [ApiKeyResource, CrudAction]> = [
  ['account', 'create'],
  ['account', 'delete'],
  ['settings', 'create'],
  ['settings', 'read'],
  ['settings', 'delete'],
  ['add_by_rss', 'update'],
  ['history', 'create'],
  ['history', 'delete'],
];

const optionalOperations = new Set([
  'get /account/{id_text}',
  'get /playlist/{playlist_id_text}',
  'get /playlist/{playlist_id_text}/resources',
  'get /playlist/{playlist_id_text}/resources/queue-by-list-position',
  'get /playlist/{playlist_id_text}/resources/shuffle',
  'get /clip/{clip_id_text}',
]);

const closedOperations: ReadonlyArray<readonly [string, string]> = [
  ['get', '/auth/sessions'],
  ['get', '/auth/api-keys'],
  ['post', '/auth/api-keys'],
  ['delete', '/auth/api-keys/{api_key_id_text}'],
  ['delete', '/account/delete'],
  ['get', '/billing/status'],
  ['post', '/billing/paypal/orders'],
  ['post', '/stats/listen'],
  ['post', '/stats/open'],
];

const operationTemplates: Record<
  ApiKeyResource,
  ReadonlyArray<readonly [string, string, string]>
> = {
  account: [
    ['get', '/auth/me', 'read'],
    ['put', '/account', 'update'],
    ['get', '/account/{id_text}', 'read'],
    ['get', '/my-profile/podcasts/az', 'read'],
    ['get', '/my-profile/albums/az', 'read'],
    ['get', '/my-profile/playlists/az', 'read'],
    ['get', '/my-profile/clips/recent', 'read'],
  ],
  settings: [
    ['patch', '/account-settings/locale', 'update'],
    ['patch', '/account-settings/playback', 'update'],
    ['patch', '/account-settings/notification', 'update'],
    ['post', '/account-settings/notification-type', 'update'],
    ['delete', '/account-settings/notification-type', 'update'],
    ['put', '/account/auto-download/channels', 'update'],
  ],
  subscriptions: [
    ['get', '/account/subscribed/{az|recent|top}', 'read'],
    ['get', '/channel/subscribed/{az|recent|top}', 'read'],
    ['get', '/item/subscribed/{recent|top}', 'read'],
    ['get', '/live-item/subscribed/{recent|top}', 'read'],
    ['get', '/live-item/subscribed/upcoming', 'read'],
    ['get', '/clip/public/subscribed/{recent|top}', 'read'],
    ['get', '/playlist/private/followed/{top|recent|oldest|az}', 'read'],
    ['post', '/account/follow/channel', 'create'],
    ['post', '/account/follow/channel/bulk', 'create'],
    ['post', '/account/unfollow/channel', 'delete'],
    ['post', '/account/unfollow/bulk', 'delete'],
    ['post', '/account/follow/account', 'create'],
    ['post', '/account/unfollow/account', 'delete'],
    ['post', '/account/follow/playlist', 'create'],
    ['post', '/account/unfollow/playlist', 'delete'],
    ['get', '/account/channel-seen', 'read'],
    ['get', '/account/channel-seen/add-by-rss', 'read'],
    ['post', '/account/channel-seen/mark', 'update'],
    ['post', '/account/channel-seen/mark-all', 'update'],
    ['post', '/account/channel-seen/mark-add-by-rss', 'update'],
    ['get', '/account/opml/export', 'read'],
    ['post', '/account/opml/import', 'create'],
    ['get', '/account/opml/import/status/{request_id}', 'read'],
  ],
  add_by_rss: [
    ['get', '/account/follow/add-by-rss-channel/{account_id_text}', 'read'],
    ['post', '/account/follow/add-by-rss-channel', 'create'],
    ['post', '/account/unfollow/add-by-rss-channel', 'delete'],
    ['post', '/account/add-by-rss/chapters-transcript', 'read'],
    ['post', '/account/add-by-rss/remote-item/lookup', 'read'],
    ['post', '/account/add-by-rss/remote-item/resolve', 'read'],
    ['post', '/account/add-by-rss/parse', 'create'],
    ['post', '/account/add-by-rss/parse/all', 'create'],
    ['get', '/account/add-by-rss/parse/status/{request_id}', 'read'],
    ['post', '/mq/rss/add/on-demand', 'create'],
    ['post', '/mq/rss/refresh/on-demand', 'create'],
  ],
  playlists: [
    ['get', '/playlist/private/likes', 'read'],
    ['post', '/playlist/private/likes/membership', 'read'],
    ['post', '/playlist/private/likes/toggle', 'update'],
    ['get', '/playlist/private/{top|recent|oldest|az}', 'read'],
    ['post', '/playlist', 'create'],
    ['get', '/playlist/{playlist_id_text}', 'read'],
    ['patch', '/playlist/{playlist_id_text}', 'update'],
    ['delete', '/playlist/{playlist_id_text}', 'delete'],
    ['get', '/playlist/{playlist_id_text}/resources/private-all', 'read'],
    ['get', '/playlist/{playlist_id_text}/resources/queue-by-list-position', 'read'],
    ['get', '/playlist/{playlist_id_text}/resources/shuffle', 'read'],
    ['get', '/playlist/{playlist_id_text}/resources', 'read'],
    ['post', '/playlist/{playlist_id_text}/clip/{clip_id_text}/{first|between|last}', 'create'],
    ['delete', '/playlist/{playlist_id_text}/clip/{clip_id_text}', 'delete'],
    ['post', '/playlist/{playlist_id_text}/item/{item_id_text}/{first|between|last}', 'create'],
    ['delete', '/playlist/{playlist_id_text}/item/{item_id_text}', 'delete'],
    ['post', '/playlist/{playlist_id_text}/item-add-by-rss/{first|between|last}', 'create'],
    ['delete', '/playlist/{playlist_id_text}/item-add-by-rss/{add_by_rss_hash_id}', 'delete'],
    [
      'post',
      '/playlist/{playlist_id_text}/item-soundbite/{soundbite_id_text}/{first|between|last}',
      'create',
    ],
    ['delete', '/playlist/{playlist_id_text}/item-soundbite/{soundbite_id_text}', 'delete'],
  ],
  queue: [
    ['get', '/queue/all-for-account/private', 'read'],
    ['post', '/queue/{queue_id_text}/update-is-active', 'update'],
    ['get', '/queue/resources/all-by-account-abridged', 'read'],
    ['get', '/queue/{queue_id_text}/resources/now-playing', 'read'],
    ['get', '/queue/{queue_id_text}/resources/upcoming-all', 'read'],
    ['get', '/queue/{queue_id_text}/resources/history-paginated', 'read'],
    ['post', '/queue/{queue_id_text}/resources/promote-upcoming', 'update'],
    ['post', '/queue/{queue_id_text}/playback-events/replay', 'update'],
    [
      'post',
      '/queue/{queue_id_text}/clip/{clip_id_text}/{now-playing|next|last|between|history}',
      'create',
    ],
    ['delete', '/queue/{queue_id_text}/clip/{clip_id_text}', 'delete'],
    [
      'post',
      '/queue/{queue_id_text}/item/{item_id_text}/{now-playing|next|last|between|history}',
      'create',
    ],
    ['delete', '/queue/{queue_id_text}/item/{item_id_text}', 'delete'],
    [
      'post',
      '/queue/{queue_id_text}/item-add-by-rss/{now-playing|next|last|between|history}',
      'create',
    ],
    ['delete', '/queue/{queue_id_text}/item-add-by-rss/{add_by_rss_hash_id}', 'delete'],
    [
      'post',
      '/queue/{queue_id_text}/item-soundbite/{item_soundbite_id_text}/{now-playing|next|last|between|history}',
      'create',
    ],
    ['delete', '/queue/{queue_id_text}/item-soundbite/{item_soundbite_id_text}', 'delete'],
  ],
  history: [
    ['get', '/account/content-log', 'read'],
    ['get', '/account/taste-profile', 'read'],
    ['get', '/account/taste-profile/hidden', 'read'],
    ['post', '/account/taste-profile/hide', 'update'],
    ['post', '/account/taste-profile/unhide', 'update'],
    ['get', '/account/recommendations', 'read'],
    ['post', '/account/taste-profile/weight', 'update'],
  ],
  clips: [
    ['get', '/clip/private', 'read'],
    ['post', '/clip', 'create'],
    ['get', '/clip/{clip_id_text}', 'read'],
    ['patch', '/clip/{clip_id_text}', 'update'],
    ['delete', '/clip/{clip_id_text}', 'delete'],
  ],
  notifications: [
    ['get', '/account/notifications', 'read'],
    ['get', '/account/notifications/unread-count', 'read'],
    ['post', '/account/notifications/mark-read', 'update'],
    ['post', '/account/notifications/mark-read-by-item', 'update'],
    ['post', '/account/notifications/{notification_id}/mark-read', 'update'],
    ['get', '/account/notification-preferences', 'read'],
    ['put', '/account/notification-preferences', 'update'],
    ['get', '/account/events', 'read'],
    ['get', '/account/notification/channel/{channel_id_text}', 'read'],
    ['get', '/account/notification/channels', 'read'],
    ['post', '/account/notification/channel', 'create'],
    ['delete', '/account/notification/channel/{channel_id_text}', 'delete'],
    ['post', '/account/notification/channels/bulk-enable', 'update'],
    ['post', '/account/notification/channels/bulk-disable', 'update'],
    ['post', '/account/notification/channel/type', 'create'],
    ['post', '/account/notification/channels/bulk-type', 'update'],
    ['delete', '/account/notification/channel/{channel_id_text}/type/{type}', 'delete'],
    ['post', '/account/fcm-device/create', 'create'],
    ['put', '/account/fcm-device/update', 'update'],
    ['delete', '/account/fcm-device/delete', 'delete'],
    ['get', '/account/fcm-device/all-for-account', 'read'],
    ['put', '/account/fcm-device/update-locale', 'update'],
    ['post', '/account/webpush-device/create', 'create'],
    ['put', '/account/webpush-device/update', 'update'],
    ['delete', '/account/webpush-device/delete', 'delete'],
    ['get', '/account/webpush-device/all-for-account', 'read'],
    ['put', '/account/webpush-device/update-locale', 'update'],
    ['post', '/account/up-device/create', 'create'],
    ['put', '/account/up-device/update', 'update'],
    ['delete', '/account/up-device/delete', 'delete'],
    ['get', '/account/up-device/for-account', 'read'],
    ['put', '/account/up-device/update-locale', 'update'],
    ['delete', '/account/up-device/delete-all', 'delete'],
  ],
};

function expandPath(pathTemplate: string): string[] {
  const match = /\{([^{}|]+(?:\|[^{}|]+)+)\}/.exec(pathTemplate);
  const body = match?.[1];
  if (!match || body === undefined) {
    return [pathTemplate];
  }
  const expanded: string[] = [];
  for (const alternative of body.split('|')) {
    const replaced =
      pathTemplate.slice(0, match.index) +
      alternative +
      pathTemplate.slice(match.index + match[0].length);
    expanded.push(...expandPath(replaced));
  }
  return expanded;
}

function operationRows(): ApiKeyOperationRow[] {
  const rows: ApiKeyOperationRow[] = [];
  for (const resource of API_KEY_RESOURCES) {
    for (const template of operationTemplates[resource]) {
      const method = template[0];
      const pathTemplate = template[1];
      const actionName = template[2];
      if (!isCrudAction(actionName)) {
        throw new Error(`unknown action ${actionName}`);
      }
      for (const routePath of expandPath(pathTemplate)) {
        rows.push({
          method,
          path: routePath,
          resource,
          action: actionName,
          optional: optionalOperations.has(`${method} ${routePath}`),
        });
      }
    }
  }
  return rows;
}

function supportedActionsSentence(): string {
  const clauses = API_KEY_RESOURCES.map(
    (resource) => `${resource} ${API_KEY_SUPPORTED_ACTIONS[resource].join(', ')}`
  );
  return `Supported actions: ${clauses.join('; ')}`;
}

function lineAt(lines: readonly string[], index: number): string | undefined {
  if (index < 0 || index >= lines.length) {
    return undefined;
  }
  return lines[index];
}

function parseOperations(spec: string): Map<string, string> {
  const lines = spec.split('\n');
  const pathsStart = lines.indexOf('paths:');
  const operations = new Map<string, string>();
  let currentPath: string | null = null;
  for (let index = pathsStart + 1; index < lines.length; index += 1) {
    const line = lineAt(lines, index);
    if (line === undefined) {
      break;
    }
    if (PATH_LINE.test(line)) {
      currentPath = line.slice(2, -1);
      continue;
    }
    const methodMatch = METHOD_LINE.exec(line);
    const method = methodMatch?.[1];
    if (!method || currentPath === null) {
      continue;
    }
    let end = index + 1;
    while (end < lines.length) {
      const next = lineAt(lines, end);
      if (next === undefined || PATH_LINE.test(next) || METHOD_LINE.test(next)) {
        break;
      }
      end += 1;
    }
    operations.set(`${method} ${currentPath}`, lines.slice(index, end).join('\n'));
    index = end - 1;
  }
  return operations;
}

function readFolded(lines: readonly string[], headerIndex: number): string {
  const header = lineAt(lines, headerIndex);
  if (header === undefined) {
    throw new Error('missing folded description');
  }
  const indent = header.startsWith('      ') ? '        ' : '    ';
  const parts: string[] = [];
  for (let index = headerIndex + 1; index < lines.length; index += 1) {
    const line = lineAt(lines, index);
    if (line === undefined) {
      break;
    }
    if (line.startsWith(indent)) {
      parts.push(line.trim());
      continue;
    }
    if (line === '') {
      let next = index + 1;
      while (next < lines.length && lineAt(lines, next) === '') {
        next += 1;
      }
      const following = lineAt(lines, next);
      if (following !== undefined && following.startsWith(indent)) {
        parts.push('');
        continue;
      }
    }
    break;
  }
  return parts.join(' ');
}

function infoDescription(spec: string): string {
  const lines = spec.split('\n');
  const headerIndex = lines.findIndex(
    (line, index) =>
      line === '  description: >' && lineAt(lines, index - 1) === '  title: Podverse API'
  );
  if (headerIndex < 0) {
    throw new Error('info description is not a folded block');
  }
  return readFolded(lines, headerIndex);
}

function apiKeyAuthDescription(spec: string): string {
  const lines = spec.split('\n');
  const schemeIndex = lines.indexOf('    apiKeyAuth:');
  if (schemeIndex < 0) {
    throw new Error('missing apiKeyAuth');
  }
  let headerIndex = -1;
  for (let index = schemeIndex + 1; index < lines.length; index += 1) {
    const line = lineAt(lines, index);
    if (line === '      description: >') {
      headerIndex = index;
      break;
    }
    if (line === undefined || (!line.startsWith('      ') && line !== '')) {
      break;
    }
  }
  if (headerIndex < 0) {
    throw new Error('apiKeyAuth description is not a folded block');
  }
  return readFolded(lines, headerIndex);
}

function documentSecurity(spec: string): string {
  const lines = spec.split('\n');
  const pathsIndex = lines.indexOf('paths:');
  let securityIndex = -1;
  for (let index = pathsIndex - 1; index >= 0; index -= 1) {
    if (lineAt(lines, index) === 'security:') {
      securityIndex = index;
      break;
    }
  }
  if (securityIndex < 0 || pathsIndex < 0) {
    throw new Error('missing document security');
  }
  return lines.slice(securityIndex, pathsIndex).join('\n');
}

function hasEmptyRequirement(operation: string): boolean {
  return operation.split('\n').some((line) => line.trim() === '- {}');
}

describe('OpenAPI API key permissions', () => {
  const rows = operationRows();

  it('expands to 165 operations with the section counts', () => {
    expect(rows).toHaveLength(165);
    expect(new Set(rows.map((row) => `${row.method} ${row.path}`)).size).toBe(165);
    for (const resource of API_KEY_RESOURCES) {
      expect(rows.filter((row) => row.resource === resource)).toHaveLength(sectionCounts[resource]);
    }
    expect(rows.filter((row) => row.optional)).toHaveLength(6);
    expect(rows.some((row) => row.path === '/stats/listen' || row.path === '/stats/open')).toBe(
      false
    );
  });

  it('uses only actions a resource supports', () => {
    for (const row of rows) {
      expect(apiKeyResourceSupportsAction(row.resource, row.action)).toBe(true);
    }
    for (const [resource, action] of unsupportedCells) {
      expect(rows.some((row) => row.resource === resource && row.action === action)).toBe(false);
    }
  });

  it('marks accepting operations and leaves every other operation closed to keys', () => {
    const spec = fs.readFileSync(specPath, 'utf8');
    const operations = parseOperations(spec);
    const failures: string[] = [];
    const rowKeys = new Set(rows.map((row) => `${row.method} ${row.path}`));

    for (const row of rows) {
      const key = `${row.method} ${row.path}`;
      const operation = operations.get(key);
      if (operation === undefined) {
        failures.push(`missing ${key}`);
        continue;
      }
      if (!operation.includes('- apiKeyAuth: []')) {
        failures.push(`${key} missing apiKeyAuth`);
      }
      if (!operation.includes('x-api-key-permission:')) {
        failures.push(`${key} missing x-api-key-permission`);
      }
      if (!operation.includes(`resource: ${row.resource}`)) {
        failures.push(`${key} resource`);
      }
      if (!operation.includes(`action: ${row.action}`)) {
        failures.push(`${key} action`);
      }
      if (!operation.includes('bearerAuth') || !operation.includes('cookieAuth')) {
        failures.push(`${key} session schemes`);
      }
      const anonymous = hasEmptyRequirement(operation);
      if (row.optional && !anonymous) {
        failures.push(`${key} should accept no credentials`);
      }
      if (!row.optional && anonymous) {
        failures.push(`${key} should require a credential`);
      }
    }

    let permissionCount = 0;
    for (const [key, operation] of operations) {
      if (operation.includes('x-api-key-permission')) {
        permissionCount += 1;
      }
      if (
        (operation.includes('apiKeyAuth') || operation.includes('x-api-key-permission')) &&
        !rowKeys.has(key)
      ) {
        failures.push(`closed operation accepts a key: ${key}`);
      }
    }
    if (permissionCount !== 165) {
      failures.push(`x-api-key-permission count ${permissionCount}`);
    }

    for (const [method, routePath] of closedOperations) {
      const key = `${method} ${routePath}`;
      const operation = operations.get(key);
      if (operation === undefined) {
        failures.push(`missing closed operation ${key}`);
        continue;
      }
      if (operation.includes('apiKeyAuth') || operation.includes('x-api-key-permission')) {
        failures.push(`${key} accepts a key`);
      }
    }

    expect(failures).toEqual([]);
  });

  it('explains how to send a key and lists supported actions on the scheme', () => {
    const spec = fs.readFileSync(specPath, 'utf8');
    const introduction = infoDescription(spec);
    expect(introduction).toContain('Authorization: Bearer pvk_');
    expect(introduction).toContain('x-api-key-permission');
    expect(documentSecurity(spec)).not.toContain('apiKeyAuth');
    expect(apiKeyAuthDescription(spec)).toContain(supportedActionsSentence());
  });
});
