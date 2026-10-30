import type { ValidationResult } from '@podverse/helpers';

export type TestPushArgMap = { [key: string]: string | string[] };

export type TestPushRequest =
  | { kind: 'help' }
  | { kind: 'invalid'; message: string }
  | { kind: 'list' | 'send'; username: string; installationId: string | null };

export type PushSendOutcome = {
  success: boolean;
  errorCode: string | null;
  errorMessage: string | null;
};

export type TestPushDeviceLine = {
  service: 'firebase' | 'webpush' | 'unifiedpush';
  platform: string | null;
  installationId: string | null;
  secretSuffix: string;
  locale: string;
};

export const NOTIFICATIONS_TEST_PUSH_HELP = `notificationsTestPush

Send a visible test push to devices registered for one account, or list those
devices without sending. Refuses unless NOTIFICATIONS_TEST_PUSH_ENABLED is true.
Does not read push preferences and does not write an inbox row.

Flags:
  --username name           Account username (required except for --help)
  --list                    Print registered devices and send nothing
  --installation-id id      Limit to one FCM installation
  --help                    Show this text
`;

const KNOWN_FLAGS = new Set(['help', 'h', 'username', 'list', 'installation-id', '_']);

export function isNotificationsTestPushEnabled(envValue: string | undefined): boolean {
  return envValue === 'true';
}

export function isNotificationsTestPushHelpArgv(argv: readonly string[]): boolean {
  return argv.includes('--help') || argv.includes('-h');
}

export function notificationsTestPushEnabledResult(envValue: string | undefined): ValidationResult {
  const enabled = isNotificationsTestPushEnabled(envValue);
  const isSet = envValue !== undefined && envValue !== '';
  return {
    name: 'NOTIFICATIONS_TEST_PUSH_ENABLED',
    isSet,
    isValid: enabled,
    isRequired: true,
    message: enabled ? 'OK' : 'Must be the string true',
    category: 'Notifications',
  };
}

function readFlag(args: TestPushArgMap, key: string): string | null | 'invalid' {
  const value = args[key];
  if (value === undefined) {
    return null;
  }
  if (typeof value !== 'string' || value === '') {
    return 'invalid';
  }
  return value;
}

export function parseNotificationsTestPushArgs(args: TestPushArgMap): TestPushRequest {
  for (const key of Object.keys(args)) {
    if (!KNOWN_FLAGS.has(key)) {
      return {
        kind: 'invalid',
        message: `Unknown flag: ${key}\n\n${NOTIFICATIONS_TEST_PUSH_HELP}`,
      };
    }
  }

  if (args.help !== undefined || args.h !== undefined) {
    return { kind: 'help' };
  }

  const username = readFlag(args, 'username');
  if (username === 'invalid') {
    return {
      kind: 'invalid',
      message: `Username must be a single value.\n\n${NOTIFICATIONS_TEST_PUSH_HELP}`,
    };
  }
  if (username === null) {
    return {
      kind: 'invalid',
      message: `Username is required.\n\n${NOTIFICATIONS_TEST_PUSH_HELP}`,
    };
  }

  const installationId = readFlag(args, 'installation-id');
  if (installationId === 'invalid') {
    return {
      kind: 'invalid',
      message: `Installation id must be a single value.\n\n${NOTIFICATIONS_TEST_PUSH_HELP}`,
    };
  }

  return {
    kind: args.list !== undefined ? 'list' : 'send',
    username,
    installationId,
  };
}

export function secretSuffix(value: string): string {
  if (value.length <= 6) {
    return 'redacted';
  }
  return value.slice(-6);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function outcomeFromUnknownResponse(value: unknown): PushSendOutcome {
  if (!isRecord(value)) {
    return { success: false, errorCode: null, errorMessage: 'No provider response' };
  }
  if (value.success === true) {
    return { success: true, errorCode: null, errorMessage: null };
  }
  const error = isRecord(value.error) ? value.error : null;
  const errorCode = error !== null && typeof error.code === 'string' ? error.code : null;
  const errorMessage =
    error !== null && typeof error.message === 'string'
      ? error.message
      : typeof value.error === 'string'
        ? value.error
        : 'Send failed';
  return { success: false, errorCode, errorMessage };
}

function flattenFirebaseResponses(result: unknown): unknown[] {
  if (!Array.isArray(result)) {
    return [];
  }
  const responses: unknown[] = [];
  for (const batch of result) {
    if (isRecord(batch) && Array.isArray(batch.responses)) {
      responses.push(...batch.responses);
      continue;
    }
    responses.push(batch);
  }
  return responses;
}

export function outcomeFromSendResult(
  service: 'firebase' | 'webpush' | 'unifiedpush',
  result: unknown
): PushSendOutcome {
  if (service === 'firebase') {
    const responses = flattenFirebaseResponses(result);
    const first = responses[0];
    if (first === undefined) {
      return { success: false, errorCode: null, errorMessage: 'No provider response' };
    }
    return outcomeFromUnknownResponse(first);
  }
  if (!Array.isArray(result) || result[0] === undefined) {
    return { success: false, errorCode: null, errorMessage: 'No provider response' };
  }
  return outcomeFromUnknownResponse(result[0]);
}

export function formatDeviceLine(device: TestPushDeviceLine): string {
  const platform = device.platform === null ? '' : ` platform=${device.platform}`;
  const installation =
    device.installationId === null ? '' : ` installation_id=${device.installationId}`;
  return (
    `${device.service}${platform}${installation} ` +
    `suffix=${device.secretSuffix} locale=${device.locale}`
  );
}

export function formatOutcomeLine(outcome: PushSendOutcome): string {
  if (outcome.success) {
    return 'accepted';
  }
  const code = outcome.errorCode === null ? '' : ` code=${outcome.errorCode}`;
  const message = outcome.errorMessage === null ? '' : ` message=${oneLine(outcome.errorMessage)}`;
  return `failed${code}${message}`;
}

export function failedOutcome(errorCode: string, errorMessage: string): PushSendOutcome {
  return { success: false, errorCode, errorMessage };
}
