/* eslint-disable no-console */
import http from 'node:http';
import { URL } from 'node:url';

import type { ValidationResult, ValidationSummary } from '@podverse/helpers-config';
import {
  displayValidationResults,
  validateDefaultTheme,
  validateLocale,
  validateOptional,
  validatePositiveNumber,
  validateProxyUserAgent,
  validateRequired,
  validateServerEnv,
  validateSignupMode,
  validateSupportedLocalesList,
  validateSupportedThemesList,
  validateWebProtocol,
} from '@podverse/helpers-config';

// Keep key lists in sync with apps/web/src/config/runtime-config.ts.
const requiredKeys = [
  'NEXT_PUBLIC_ACCOUNT_SIGNUP_MODE',
  'NEXT_PUBLIC_API_HOST',
  'NEXT_PUBLIC_API_PREFIX',
  'NEXT_PUBLIC_API_PROTOCOL',
  'NEXT_PUBLIC_API_VERSION',
  'NEXT_PUBLIC_DEFAULT_THEME',
  'NEXT_PUBLIC_FEATURES_DEFAULT_LOCALE',
  'NEXT_PUBLIC_FEATURES_SUPPORTED_LOCALES',
  'NEXT_PUBLIC_PROXY_USER_AGENT',
  'NEXT_PUBLIC_SSR_API_HOST',
  'NEXT_PUBLIC_SSR_API_PROTOCOL',
  'NEXT_PUBLIC_SUPPORTED_THEMES',
  'NEXT_PUBLIC_WEB_DOMAIN',
  'NEXT_PUBLIC_WEB_PROTOCOL',
] as const;

const optionalKeys = [
  'NEXT_PUBLIC_API_PORT',
  'NEXT_PUBLIC_APP_VALUE_LIGHTNING_LNADDRESS_ADDRESS',
  'NEXT_PUBLIC_APP_VALUE_LIGHTNING_LNADDRESS_NAME',
  'NEXT_PUBLIC_APP_VALUE_LIGHTNING_NODE_ADDRESS',
  'NEXT_PUBLIC_APP_VALUE_LIGHTNING_NODE_CUSTOM_KEY',
  'NEXT_PUBLIC_APP_VALUE_LIGHTNING_NODE_CUSTOM_VALUE',
  'NEXT_PUBLIC_APP_VALUE_LIGHTNING_NODE_NAME',
  'NEXT_PUBLIC_APP_VALUE_METABOOST_NODE',
  'NEXT_PUBLIC_APP_VALUE_METABOOST_STANDARD',
  'NEXT_PUBLIC_BRAND_APPLE_TOUCH_ICON_URL',
  'NEXT_PUBLIC_BRAND_APP_ICON_192_URL',
  'NEXT_PUBLIC_BRAND_APP_ICON_512_URL',
  'NEXT_PUBLIC_BRAND_BACKGROUND_COLOR',
  'NEXT_PUBLIC_BRAND_FAVICON_ICO_URL',
  'NEXT_PUBLIC_BRAND_FAVICON_PNG_96_URL',
  'NEXT_PUBLIC_BRAND_FAVICON_SVG_URL',
  'NEXT_PUBLIC_BRAND_LOGO_DARK',
  'NEXT_PUBLIC_BRAND_LOGO_LIGHT',
  'NEXT_PUBLIC_BRAND_NAME',
  'NEXT_PUBLIC_BRAND_THEME_COLOR',
  'NEXT_PUBLIC_CONTACT_EMAIL',
  'NEXT_PUBLIC_POLLING_INTERVAL_MS',
  'NEXT_PUBLIC_SERVER_ENV',
  'NEXT_PUBLIC_SOCIAL_ACTIVITY_PUB',
  'NEXT_PUBLIC_SOCIAL_DISCORD',
  'NEXT_PUBLIC_SOCIAL_GITHUB',
  'NEXT_PUBLIC_SOCIAL_MATRIX',
  'NEXT_PUBLIC_SOCIAL_X',
  'NEXT_PUBLIC_SSR_API_PORT',
  'NEXT_PUBLIC_WEBPUSH_VAPID_PUBLIC_KEY',
] as const;

const allKeys = [...requiredKeys, ...optionalKeys];

function validatePort(): ValidationResult {
  const value = process.env.PORT;
  const isSet =
    value !== undefined && value !== null && typeof value === 'string' && value.trim() !== '';
  if (!isSet) {
    return {
      name: 'PORT',
      isSet: false,
      isValid: false,
      isRequired: true,
      message: 'Missing',
      category: 'Server',
    };
  }
  const port = Number.parseInt(value, 10);
  if (!Number.isFinite(port) || port <= 0) {
    return {
      name: 'PORT',
      isSet: true,
      isValid: false,
      isRequired: true,
      message: `Invalid value: "${value}" - must be a positive integer`,
      category: 'Server',
    };
  }
  return {
    name: 'PORT',
    isSet: true,
    isValid: true,
    isRequired: true,
    message: `Set to ${value}`,
    category: 'Server',
  };
}

function validateOne(key: string, isRequired: boolean): ValidationResult {
  const category = getCategory(key);
  if (
    key === 'NEXT_PUBLIC_SSR_API_PROTOCOL' ||
    key === 'NEXT_PUBLIC_API_PROTOCOL' ||
    key === 'NEXT_PUBLIC_WEB_PROTOCOL'
  ) {
    return validateWebProtocol(key, category, true);
  }
  if (key === 'NEXT_PUBLIC_ACCOUNT_SIGNUP_MODE') {
    return validateSignupMode(key, category);
  }
  if (key === 'NEXT_PUBLIC_SERVER_ENV') {
    return validateServerEnv(key, category);
  }
  if (key === 'NEXT_PUBLIC_PROXY_USER_AGENT') {
    return validateProxyUserAgent(key, category);
  }
  if (key === 'NEXT_PUBLIC_FEATURES_SUPPORTED_LOCALES') {
    return validateSupportedLocalesList(key, category);
  }
  if (key === 'NEXT_PUBLIC_FEATURES_DEFAULT_LOCALE') {
    return validateLocale(key, category, true);
  }
  if (key === 'NEXT_PUBLIC_SUPPORTED_THEMES') {
    return validateSupportedThemesList(key, category);
  }
  if (key === 'NEXT_PUBLIC_DEFAULT_THEME') {
    return validateDefaultTheme(key, category);
  }
  if (key === 'NEXT_PUBLIC_SSR_API_PORT' || key === 'NEXT_PUBLIC_API_PORT') {
    return validatePositiveNumber(key, category, false);
  }
  if (key === 'NEXT_PUBLIC_POLLING_INTERVAL_MS') {
    return validatePositiveNumber(key, category, false);
  }
  if (isRequired) {
    return validateRequired(key, category);
  }
  return validateOptional(key, category, 'Skipped');
}

function getCategory(key: string): string {
  const map: Record<string, string> = {
    PORT: 'Server',
    NEXT_PUBLIC_ACCOUNT_SIGNUP_MODE: 'Account',
    NEXT_PUBLIC_API_HOST: 'API',
    NEXT_PUBLIC_API_PREFIX: 'API',
    NEXT_PUBLIC_API_PROTOCOL: 'API',
    NEXT_PUBLIC_API_VERSION: 'API',
    NEXT_PUBLIC_API_PORT: 'API',
    NEXT_PUBLIC_DEFAULT_THEME: 'Themes',
    NEXT_PUBLIC_FEATURES_DEFAULT_LOCALE: 'Features',
    NEXT_PUBLIC_FEATURES_SUPPORTED_LOCALES: 'Features',
    NEXT_PUBLIC_PROXY_USER_AGENT: 'Proxy',
    NEXT_PUBLIC_BRAND_APPLE_TOUCH_ICON_URL: 'Brand',
    NEXT_PUBLIC_BRAND_APP_ICON_192_URL: 'Brand',
    NEXT_PUBLIC_BRAND_APP_ICON_512_URL: 'Brand',
    NEXT_PUBLIC_BRAND_BACKGROUND_COLOR: 'Brand',
    NEXT_PUBLIC_BRAND_FAVICON_ICO_URL: 'Brand',
    NEXT_PUBLIC_BRAND_FAVICON_PNG_96_URL: 'Brand',
    NEXT_PUBLIC_BRAND_FAVICON_SVG_URL: 'Brand',
    NEXT_PUBLIC_BRAND_THEME_COLOR: 'Brand',
    NEXT_PUBLIC_SERVER_ENV: 'General',
    NEXT_PUBLIC_SSR_API_HOST: 'API (SSR)',
    NEXT_PUBLIC_SSR_API_PROTOCOL: 'API (SSR)',
    NEXT_PUBLIC_SSR_API_PORT: 'API (SSR)',
    NEXT_PUBLIC_SUPPORTED_THEMES: 'Themes',
    NEXT_PUBLIC_WEB_DOMAIN: 'Web',
    NEXT_PUBLIC_WEB_PROTOCOL: 'Web',
    NEXT_PUBLIC_APP_VALUE_LIGHTNING_LNADDRESS_ADDRESS: 'Lightning',
    NEXT_PUBLIC_APP_VALUE_LIGHTNING_LNADDRESS_NAME: 'Lightning',
    NEXT_PUBLIC_APP_VALUE_LIGHTNING_NODE_ADDRESS: 'Lightning',
    NEXT_PUBLIC_APP_VALUE_LIGHTNING_NODE_CUSTOM_KEY: 'Lightning',
    NEXT_PUBLIC_APP_VALUE_LIGHTNING_NODE_CUSTOM_VALUE: 'Lightning',
    NEXT_PUBLIC_APP_VALUE_LIGHTNING_NODE_NAME: 'Lightning',
    NEXT_PUBLIC_APP_VALUE_METABOOST_STANDARD: 'Lightning',
    NEXT_PUBLIC_APP_VALUE_METABOOST_NODE: 'Lightning',
    NEXT_PUBLIC_BRAND_NAME: 'Brand',
    NEXT_PUBLIC_BRAND_LOGO_DARK: 'Brand',
    NEXT_PUBLIC_BRAND_LOGO_LIGHT: 'Brand',
    NEXT_PUBLIC_CONTACT_EMAIL: 'Brand',
    NEXT_PUBLIC_POLLING_INTERVAL_MS: 'API',
    NEXT_PUBLIC_SOCIAL_ACTIVITY_PUB: 'Social',
    NEXT_PUBLIC_SOCIAL_DISCORD: 'Social',
    NEXT_PUBLIC_SOCIAL_GITHUB: 'Social',
    NEXT_PUBLIC_SOCIAL_MATRIX: 'Social',
    NEXT_PUBLIC_SOCIAL_X: 'Social',
    NEXT_PUBLIC_WEBPUSH_VAPID_PUBLIC_KEY: 'Notifications',
  };
  return map[key] ?? 'Config';
}

function buildValidationResults(): ValidationResult[] {
  const results: ValidationResult[] = [];
  results.push(validatePort());
  for (const key of requiredKeys) {
    results.push(validateOne(key, true));
  }
  for (const key of optionalKeys) {
    results.push(validateOne(key, false));
  }
  const lnaddressName = normalizeEnvValue(
    process.env.NEXT_PUBLIC_APP_VALUE_LIGHTNING_LNADDRESS_NAME
  );
  const lnaddressAddress = normalizeEnvValue(
    process.env.NEXT_PUBLIC_APP_VALUE_LIGHTNING_LNADDRESS_ADDRESS
  );
  const nodeName = normalizeEnvValue(process.env.NEXT_PUBLIC_APP_VALUE_LIGHTNING_NODE_NAME);
  const nodeAddress = normalizeEnvValue(process.env.NEXT_PUBLIC_APP_VALUE_LIGHTNING_NODE_ADDRESS);
  const hasLnaddress = Boolean(lnaddressName) || Boolean(lnaddressAddress);
  const hasNode = Boolean(nodeName) || Boolean(nodeAddress);
  if (hasLnaddress && hasNode) {
    results.push({
      name: 'NEXT_PUBLIC_APP_VALUE_LIGHTNING',
      isSet: true,
      isValid: false,
      isRequired: false,
      message: 'Set only one: LNAddress or Node app value vars (not both).',
      category: 'Lightning',
    });
  }
  return results;
}

function buildSummary(results: ValidationResult[]): ValidationSummary {
  const total = results.length;
  const passed = results.filter((r) => r.isValid && r.isSet).length;
  const failed = results.filter((r) => !r.isValid).length;
  const requiredMissing = results.filter((r) => r.isRequired && !r.isValid).length;
  const skipped = results.filter((r) => !r.isRequired && !r.isSet).length;
  const defaultsUsed = results.filter(
    (r) => r.isValid && r.isSet && (r.message.includes('Use Default') || r.message === 'Blank')
  ).length;
  return {
    total,
    passed,
    failed,
    requiredMissing,
    skipped,
    defaultsUsed,
    results,
  };
}

const normalizeEnvValue = (value: string | undefined): string | undefined =>
  value === '' ? undefined : value;

function buildRuntimeConfig(): { env: Record<string, string | undefined> } {
  const env: Record<string, string | undefined> = {};
  for (const key of allKeys) {
    env[key] = normalizeEnvValue(process.env[key]);
  }
  return { env };
}

function findMissingRequiredKeys(runtimeConfig: {
  env: Record<string, string | undefined>;
}): string[] {
  return requiredKeys.filter((key) => runtimeConfig.env[key] === undefined);
}

function getPort(): number {
  const portValue = process.env.PORT;
  if (!portValue) {
    throw new Error('Missing PORT for runtime config sidecar.');
  }
  const port = Number.parseInt(portValue, 10);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error('Invalid PORT for runtime config sidecar.');
  }
  return port;
}

function sendJson(res: http.ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

console.log('Running startup validation...');
const results = buildValidationResults();
const summary = buildSummary(results);
displayValidationResults(summary);
if (summary.requiredMissing > 0) {
  console.error(
    `FATAL: ${summary.requiredMissing} required environment variable(s) are missing or invalid. Please check the validation output above for details.`
  );
  process.exit(1);
}
console.log('Startup validation completed successfully');

const server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
  const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Cache-Control': 'no-store' });
    res.end('Method Not Allowed');
    return;
  }

  if (requestUrl.pathname === '/' || requestUrl.pathname === '') {
    sendJson(res, 200, { status: 'ok', message: 'Web runtime-config sidecar is online' });
    return;
  }

  if (requestUrl.pathname !== '/runtime-config') {
    res.writeHead(404, { 'Cache-Control': 'no-store' });
    res.end('Not Found');
    return;
  }

  const runtimeConfig = buildRuntimeConfig();
  const missingKeys = findMissingRequiredKeys(runtimeConfig);
  if (missingKeys.length > 0) {
    sendJson(res, 500, {
      error: 'Missing required runtime config values.',
      missingKeys,
    });
    return;
  }

  sendJson(res, 200, runtimeConfig);
});

const port = getPort();
server.listen(port, '0.0.0.0', () => {
  console.log(`Runtime config sidecar listening on ${port}.`);
});
