/* eslint-disable no-console */
import http from 'node:http';
import { URL } from 'node:url';

import type { ValidationResult, ValidationSummary } from '@podverse/helpers-config';
import {
  displayValidationResults,
  displayValidationResultsSilent,
  isAllowedCustomThemesUrl,
  isPodverseStartupValidationSilent,
  validateDefaultTheme,
  validateLocale,
  validateOptional,
  validatePositiveNumber,
  validateRequired,
  validateSupportedLocalesList,
  validateSupportedThemesList,
  validateWebProtocol,
} from '@podverse/helpers-config';
import {
  buildIntegrationsWebConfigFromEnv,
  validateIntegrationsWebConfigFromEnv,
} from '@podverse/integrations-web/config';

// Keep key lists in sync with apps/management-web/src/config/runtime-config.ts.
const requiredKeys = [
  'NEXT_PUBLIC_API_HOST',
  'NEXT_PUBLIC_API_PREFIX',
  'NEXT_PUBLIC_API_PROTOCOL',
  'NEXT_PUBLIC_API_VERSION',
  'NEXT_PUBLIC_DEFAULT_THEME',
  'NEXT_PUBLIC_SUPPORTED_THEMES',
  'NEXT_PUBLIC_FEATURES_DEFAULT_LOCALE',
  'NEXT_PUBLIC_FEATURES_SUPPORTED_LOCALES',
  'NEXT_PUBLIC_SSR_API_HOST',
  'NEXT_PUBLIC_SSR_API_PORT',
  'NEXT_PUBLIC_SSR_API_PROTOCOL',
] as const;

const optionalKeys = [
  'NEXT_PUBLIC_API_PORT',
  'NEXT_PUBLIC_CUSTOM_THEMES_URL',
  'NEXT_PUBLIC_BRAND_APPLE_TOUCH_ICON_URL',
  'NEXT_PUBLIC_BRAND_APP_ICON_192_URL',
  'NEXT_PUBLIC_BRAND_APP_ICON_512_URL',
  'NEXT_PUBLIC_BRAND_BACKGROUND_COLOR',
  'NEXT_PUBLIC_BRAND_FAVICON_ICO_URL',
  'NEXT_PUBLIC_BRAND_FAVICON_PNG_96_URL',
  'NEXT_PUBLIC_BRAND_FAVICON_SVG_URL',
  'NEXT_PUBLIC_BRAND_NAME',
  'NEXT_PUBLIC_BRAND_THEME_COLOR',
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
  if (key === 'NEXT_PUBLIC_API_PROTOCOL' || key === 'NEXT_PUBLIC_SSR_API_PROTOCOL') {
    return validateWebProtocol(key, category, true);
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
  if (key === 'NEXT_PUBLIC_CUSTOM_THEMES_URL') {
    const value = process.env[key] ?? '';
    if (value.trim() === '') {
      return {
        name: key,
        isSet: false,
        isValid: true,
        isRequired: false,
        message: 'Blank',
        category,
      };
    }
    if (!isAllowedCustomThemesUrl(value)) {
      return {
        name: key,
        isSet: true,
        isValid: false,
        isRequired: false,
        message: `Invalid value: "${value}" - must be https:// or local http://localhost/... URL`,
        category,
      };
    }
    return {
      name: key,
      isSet: true,
      isValid: true,
      isRequired: false,
      message: `Set to ${value}`,
      category,
    };
  }
  if (key === 'NEXT_PUBLIC_DEFAULT_THEME') {
    return validateDefaultTheme(key, category);
  }
  if (key === 'NEXT_PUBLIC_API_PORT') {
    return validatePositiveNumber(key, category, false);
  }
  if (key === 'NEXT_PUBLIC_SSR_API_PORT') {
    return validatePositiveNumber(key, category, isRequired);
  }
  if (key === 'NEXT_PUBLIC_SSR_API_HOST') {
    return validateRequired(key, category);
  }
  if (isRequired) {
    return validateRequired(key, category);
  }
  return validateOptional(key, category, 'Skipped');
}

function getCategory(key: string): string {
  const map: Record<string, string> = {
    PORT: 'Server',
    NEXT_PUBLIC_API_HOST: 'API',
    NEXT_PUBLIC_API_PREFIX: 'API',
    NEXT_PUBLIC_API_PROTOCOL: 'API',
    NEXT_PUBLIC_API_VERSION: 'API',
    NEXT_PUBLIC_API_PORT: 'API',
    NEXT_PUBLIC_BRAND_APPLE_TOUCH_ICON_URL: 'Brand',
    NEXT_PUBLIC_BRAND_APP_ICON_192_URL: 'Brand',
    NEXT_PUBLIC_BRAND_APP_ICON_512_URL: 'Brand',
    NEXT_PUBLIC_BRAND_BACKGROUND_COLOR: 'Brand',
    NEXT_PUBLIC_BRAND_FAVICON_ICO_URL: 'Brand',
    NEXT_PUBLIC_BRAND_FAVICON_PNG_96_URL: 'Brand',
    NEXT_PUBLIC_BRAND_FAVICON_SVG_URL: 'Brand',
    NEXT_PUBLIC_BRAND_NAME: 'Brand',
    NEXT_PUBLIC_BRAND_THEME_COLOR: 'Brand',
    NEXT_PUBLIC_CUSTOM_THEMES_URL: 'Themes',
    NEXT_PUBLIC_SSR_API_HOST: 'API',
    NEXT_PUBLIC_SSR_API_PORT: 'API',
    NEXT_PUBLIC_SSR_API_PROTOCOL: 'API',
    NEXT_PUBLIC_FEATURES_DEFAULT_LOCALE: 'Features',
    NEXT_PUBLIC_FEATURES_SUPPORTED_LOCALES: 'Features',
    NEXT_PUBLIC_DEFAULT_THEME: 'Themes',
    NEXT_PUBLIC_SUPPORTED_THEMES: 'Themes',
  };
  return map[key] ?? 'Config';
}

function validateIntegrationsWebAnalytics(): ValidationResult {
  const enabled = process.env.CLOUDFLARE_WEB_ANALYTICS_ENABLED === 'true';
  const tokenRaw = process.env.CLOUDFLARE_WEB_ANALYTICS_TOKEN;
  const tokenSet =
    tokenRaw !== undefined &&
    tokenRaw !== null &&
    typeof tokenRaw === 'string' &&
    tokenRaw.trim() !== '';

  try {
    validateIntegrationsWebConfigFromEnv(process.env);
    if (!enabled) {
      return {
        name: 'CLOUDFLARE_WEB_ANALYTICS_ENABLED',
        isSet: false,
        isValid: true,
        isRequired: false,
        message: 'Disabled (default)',
        category: 'Integrations / Cloudflare Web Analytics',
      };
    }
    return {
      name: 'CLOUDFLARE_WEB_ANALYTICS_TOKEN',
      isSet: tokenSet,
      isValid: true,
      isRequired: false,
      message: 'Set',
      category: 'Integrations / Cloudflare Web Analytics',
    };
  } catch (error) {
    return {
      name: 'CLOUDFLARE_WEB_ANALYTICS_TOKEN',
      isSet: false,
      isValid: false,
      isRequired: true,
      message:
        error instanceof Error
          ? error.message
          : 'CLOUDFLARE_WEB_ANALYTICS_TOKEN is required when CLOUDFLARE_WEB_ANALYTICS_ENABLED=true',
      category: 'Integrations / Cloudflare Web Analytics',
    };
  }
}

function buildValidationResults(): ValidationResult[] {
  const results: ValidationResult[] = [];
  results.push(validatePort());
  results.push(validateIntegrationsWebAnalytics());
  for (const key of requiredKeys) {
    results.push(validateOne(key, true));
  }
  for (const key of optionalKeys) {
    results.push(validateOne(key, false));
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

function buildRuntimeConfig(): {
  env: Record<string, string | undefined>;
  integrations: ReturnType<typeof buildIntegrationsWebConfigFromEnv>;
} {
  const env: Record<string, string | undefined> = {};
  for (const key of allKeys) {
    env[key] = normalizeEnvValue(process.env[key]);
  }
  return {
    env,
    integrations: buildIntegrationsWebConfigFromEnv(process.env),
  };
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

const startupValidationSilent = isPodverseStartupValidationSilent();
if (!startupValidationSilent) {
  console.log('Running startup validation...');
}
const results = buildValidationResults();
const summary = buildSummary(results);
if (startupValidationSilent) {
  displayValidationResultsSilent(summary);
} else {
  displayValidationResults(summary);
}
if (summary.requiredMissing > 0) {
  console.error(
    `FATAL: ${summary.requiredMissing} required environment variable(s) are missing or invalid. Please check the validation output above for details.`
  );
  process.exit(1);
}
if (!startupValidationSilent) {
  console.log('Startup validation completed successfully');
}

const server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
  const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Cache-Control': 'no-store' });
    res.end('Method Not Allowed');
    return;
  }

  if (requestUrl.pathname === '/' || requestUrl.pathname === '') {
    sendJson(res, 200, {
      status: 'ok',
      message: 'Management-web runtime-config sidecar is online',
    });
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
