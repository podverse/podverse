import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { faker } from '@faker-js/faker';

import {
  LNURL_TEST_ADDRESSES,
  METABOOST_LICENSE_URL,
  METABOOST_URL,
  VALUE_RECIPIENT_SPLITS,
} from './generate-feed-constants.js';
import { buildRemoteItemXml, escapeXml } from './generate-feed-xml.js';
import { type WrittenFeedInfo } from './generate-feed-types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_LN_RECIPIENTS_PATH = path.resolve(
  __dirname,
  '..',
  'config',
  'ln-recipients.local.json'
);

type LocalLnRecipient = {
  address: string;
  name: string;
  split: number;
  fee?: boolean;
};

type LocalLnRecipientsConfig = {
  keysend: LocalLnRecipient[];
  lnaddress: LocalLnRecipient[];
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isLocalLnRecipient = (value: unknown): value is LocalLnRecipient => {
  if (!isRecord(value)) {
    return false;
  }
  const { address, name, split, fee } = value;
  if (typeof address !== 'string' || address.length === 0) {
    return false;
  }
  if (typeof name !== 'string' || name.length === 0) {
    return false;
  }
  if (typeof split !== 'number' || !Number.isFinite(split) || split <= 0) {
    return false;
  }
  if (fee !== undefined && typeof fee !== 'boolean') {
    return false;
  }
  return true;
};

const isLocalLnRecipientsConfig = (value: unknown): value is LocalLnRecipientsConfig => {
  if (!isRecord(value)) {
    return false;
  }
  const { keysend, lnaddress } = value;
  if (!Array.isArray(keysend) || !Array.isArray(lnaddress)) {
    return false;
  }
  return keysend.every(isLocalLnRecipient) && lnaddress.every(isLocalLnRecipient);
};

const readLocalLnRecipientsConfig = (): LocalLnRecipientsConfig | null => {
  if (!fs.existsSync(LOCAL_LN_RECIPIENTS_PATH)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(LOCAL_LN_RECIPIENTS_PATH, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (!isLocalLnRecipientsConfig(parsed)) {
      console.warn('Invalid local LN recipients config. Using built-in fake recipients instead.');
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn(
      'Failed to read local LN recipients config. Using built-in fake recipients instead.',
      error
    );
    return null;
  }
};

/** 07a: Lightning keysend — generate a node pubkey-like string (66 hex chars). */
const lightningNodePubkey = (): string => {
  const hexChars = '0123456789abcdef'.split('');
  return Array.from({ length: 66 }, () => faker.helpers.arrayElement(hexChars)).join('');
};

type ValueRecipientOpts = {
  type?: string;
  customKey?: string;
  customValue?: string;
  fee?: boolean;
};

/** Build one <podcast:valueRecipient> XML string. customValue only emitted when customKey is present. */
const buildValueRecipientXml = (
  address: string,
  split: number,
  name: string,
  opts?: ValueRecipientOpts
): string => {
  const parts = [
    `type="${escapeXml(opts?.type ?? 'node')}"`,
    `address="${escapeXml(address)}"`,
    `split="${split}"`,
    `name="${escapeXml(name)}"`,
  ];
  if (opts?.customKey !== undefined) {
    parts.push(`customKey="${escapeXml(opts.customKey)}"`);
    if (opts.customValue !== undefined) {
      parts.push(`customValue="${escapeXml(opts.customValue)}"`);
    }
  }
  if (opts?.fee === true) {
    parts.push('fee="true"');
  }
  return `<podcast:valueRecipient ${parts.join(' ')}/>`;
};

/** Random optional customKey, customValue (only when customKey), and fee for a valueRecipient. */
const randomValueRecipientOpts = (): ValueRecipientOpts => {
  const opts: ValueRecipientOpts = {};
  if (faker.helpers.arrayElement([true, false])) {
    opts.customKey = faker.lorem.slug();
    if (faker.helpers.arrayElement([true, false])) {
      opts.customValue = faker.lorem.word();
    }
  }
  if (faker.helpers.arrayElement([true, false])) {
    opts.fee = true;
  }
  return opts;
};

const buildFixedValueRecipients = (
  type: string,
  addresses: string[],
  labelPrefix: string
): string => {
  return addresses
    .map((address, index) =>
      buildValueRecipientXml(
        address,
        VALUE_RECIPIENT_SPLITS[index] ?? 0,
        `${labelPrefix} ${index + 1}`,
        {
          type,
          fee: index === 2,
        }
      )
    )
    .join('\n    ');
};

const buildConfiguredValueRecipients = (type: string, recipients: LocalLnRecipient[]): string => {
  return recipients
    .map((recipient) =>
      buildValueRecipientXml(recipient.address, recipient.split, recipient.name, {
        type,
        fee: recipient.fee === true,
      })
    )
    .join('\n    ');
};

/** 07a: Build channel <podcast:value> blocks for keysend + lnaddress. */
export const buildChannelValueBlock = (_recipientCount: number): string => {
  const suggested = '0.00000005000';
  const metaBoost = `<podcast:metaBoost type="post" schema="boostbox" license="${METABOOST_LICENSE_URL}">${METABOOST_URL}</podcast:metaBoost>`;
  const localRecipients = readLocalLnRecipientsConfig();
  const keysendRecipients = localRecipients
    ? buildConfiguredValueRecipients('node', localRecipients.keysend)
    : buildFixedValueRecipients(
        'node',
        [lightningNodePubkey(), lightningNodePubkey(), lightningNodePubkey()],
        'Keysend Recipient'
      );
  const lnaddressRecipients = localRecipients
    ? buildConfiguredValueRecipients('lnaddress', localRecipients.lnaddress)
    : buildFixedValueRecipients('lnaddress', LNURL_TEST_ADDRESSES, 'LNAddress Recipient');

  return [
    `<podcast:value type="lightning" method="keysend" suggested="${suggested}">`,
    `    ${metaBoost}`,
    `    ${keysendRecipients}`,
    `    </podcast:value>`,
    `<podcast:value type="lightning" method="lnaddress" suggested="${suggested}">`,
    `    ${metaBoost}`,
    `    ${lnaddressRecipients}`,
    `    </podcast:value>`,
  ].join('\n');
};

/** 07a: Build item <podcast:value> blocks (keysend + lnaddress). */
export const buildItemValueBlock = (
  includeValueTimeSplit: boolean,
  remoteItemTarget?: WrittenFeedInfo | null
): string => {
  const suggested = '0.00000005000';
  const metaBoost = `<podcast:metaBoost type="post" schema="boostbox" license="${METABOOST_LICENSE_URL}">${METABOOST_URL}</podcast:metaBoost>`;
  const localRecipients = readLocalLnRecipientsConfig();
  const keysendRecipients = localRecipients
    ? buildConfiguredValueRecipients('node', localRecipients.keysend)
    : buildFixedValueRecipients(
        'node',
        [lightningNodePubkey(), lightningNodePubkey(), lightningNodePubkey()],
        'Keysend Recipient'
      );
  const lnaddressRecipients = localRecipients
    ? buildConfiguredValueRecipients('lnaddress', localRecipients.lnaddress)
    : buildFixedValueRecipients('lnaddress', LNURL_TEST_ADDRESSES, 'LNAddress Recipient');
  let valueTimeSplitBlock = '';
  if (includeValueTimeSplit) {
    const startTime = faker.number.int({ min: 0, max: 3600 });
    const duration = faker.number.int({ min: 60, max: 600 });
    const remoteStartTime = faker.number.int({ min: 0, max: 3600 });
    const remotePercentage = faker.number.int({ min: 0, max: 100 });
    const useRemoteItem = remoteItemTarget && remoteItemTarget.guid && remoteItemTarget.url;
    if (useRemoteItem) {
      const remoteItemXml = buildRemoteItemXml({
        guid: remoteItemTarget.guid,
        url: remoteItemTarget.url,
      });
      valueTimeSplitBlock = `
      <podcast:valueTimeSplit startTime="${startTime}" duration="${duration}" remoteStartTime="${remoteStartTime}" remotePercentage="${remotePercentage}">
        ${remoteItemXml}
      </podcast:valueTimeSplit>`;
    } else {
      const vsRecipientAddress = lightningNodePubkey();
      const vsSplit = faker.number.int({ min: 1, max: 100 });
      const vsName = faker.person.fullName();
      const vsRecipientXml = buildValueRecipientXml(
        vsRecipientAddress,
        vsSplit,
        vsName,
        randomValueRecipientOpts()
      );
      valueTimeSplitBlock = `
      <podcast:valueTimeSplit startTime="${startTime}" duration="${duration}" remoteStartTime="${remoteStartTime}" remotePercentage="${remotePercentage}">
        ${vsRecipientXml}
      </podcast:valueTimeSplit>`;
    }
  }
  return [
    `<podcast:value type="lightning" method="keysend" suggested="${suggested}">`,
    `      ${metaBoost}`,
    `      ${keysendRecipients}${valueTimeSplitBlock}`,
    `      </podcast:value>`,
    `<podcast:value type="lightning" method="lnaddress" suggested="${suggested}">`,
    `      ${metaBoost}`,
    `      ${lnaddressRecipients}`,
    `      </podcast:value>`,
  ].join('\n');
};
