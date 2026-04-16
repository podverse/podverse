import { faker } from '@faker-js/faker';
import path from 'path';
import { fileURLToPath } from 'url';

import type { LocalLnRecipientsConfig } from '@podverse/v4v-btc-ln/test-data';
import {
  LNURL_TEST_ADDRESSES,
  METABOOST_URL,
  readLocalLnRecipientsConfig,
  VALUE_RECIPIENT_SPLITS,
} from '@podverse/v4v-btc-ln/test-data';

import { type WrittenFeedInfo } from './generate-feed-types.js';
import { buildRemoteItemXml, escapeXml } from './generate-feed-xml.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_LN_RECIPIENTS_PATH = path.resolve(
  __dirname,
  '..',
  'config',
  'ln-recipients.local.json'
);

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

type LightningRecipientType = 'lnaddress' | 'node';

type LightningRecipient = {
  address: string;
  fee?: boolean;
  name: string;
  split: number;
  type: LightningRecipientType;
};

const randomLightningRecipientType = (): LightningRecipientType =>
  faker.helpers.arrayElement(['lnaddress', 'node']);

const buildLocalRecipient = (
  type: LightningRecipientType,
  recipients: LocalLnRecipientsConfig | null,
  index: number
): LightningRecipient | null => {
  if (!recipients) {
    return null;
  }
  const list = type === 'lnaddress' ? recipients.lnaddress : recipients.keysend;
  const recipient = list[index];
  if (!recipient) {
    return null;
  }
  return {
    address: recipient.address,
    fee: recipient.fee,
    name: recipient.name,
    split: recipient.split,
    type,
  };
};

const buildFakeRecipient = (type: LightningRecipientType, index: number): LightningRecipient => {
  const address =
    type === 'lnaddress'
      ? (LNURL_TEST_ADDRESSES[index] ?? faker.helpers.arrayElement(LNURL_TEST_ADDRESSES))
      : lightningNodePubkey();
  const split = VALUE_RECIPIENT_SPLITS[index] ?? faker.number.int({ min: 1, max: 100 });
  const labelPrefix = type === 'lnaddress' ? 'LNAddress Recipient' : 'Keysend Recipient';
  return {
    address,
    fee: index === 2,
    name: `${labelPrefix} ${index + 1}`,
    split,
    type,
  };
};

const buildMixedLightningRecipient = (
  recipients: LocalLnRecipientsConfig | null,
  index: number
): LightningRecipient => {
  const preferredType = randomLightningRecipientType();
  const preferred = buildLocalRecipient(preferredType, recipients, index);
  if (preferred) {
    return preferred;
  }
  const fallbackType = preferredType === 'lnaddress' ? 'node' : 'lnaddress';
  const fallback = buildLocalRecipient(fallbackType, recipients, index);
  if (fallback) {
    return fallback;
  }
  return buildFakeRecipient(preferredType, index);
};

const buildMixedValueRecipients = (recipients: LocalLnRecipientsConfig | null): string => {
  const localCount = recipients
    ? Math.max(recipients.keysend.length, recipients.lnaddress.length)
    : 0;
  const count = Math.max(localCount, VALUE_RECIPIENT_SPLITS.length);
  return Array.from({ length: count }, (_, index) =>
    buildMixedLightningRecipient(recipients, index)
  )
    .map((recipient) =>
      buildValueRecipientXml(recipient.address, recipient.split, recipient.name, {
        type: recipient.type,
        fee: recipient.fee === true,
      })
    )
    .join('\n    ');
};

/** 07a: Build channel <podcast:value> blocks for lightning. */
export const buildChannelValueBlock = (_recipientCount: number): string => {
  const suggested = '0.00000005000';
  const localRecipients = readLocalLnRecipientsConfig(LOCAL_LN_RECIPIENTS_PATH);
  const recipients = buildMixedValueRecipients(localRecipients);

  return [
    `<podcast:value type="lightning" method="keysend" suggested="${suggested}">`,
    `    ${recipients}`,
    `    </podcast:value>`,
  ].join('\n');
};

/** Build channel-level standalone <podcast:metaBoost> tag (not nested in podcast:value). */
export const buildChannelMetaBoostTag = (): string => {
  return `<podcast:metaBoost standard="mb1">${METABOOST_URL}</podcast:metaBoost>`;
};

/** 07a: Build item <podcast:value> blocks (lightning only). */
export const buildItemValueBlock = (
  includeValueTimeSplit: boolean,
  remoteItemTarget?: WrittenFeedInfo | null
): string => {
  const suggested = '0.00000005000';
  const localRecipients = readLocalLnRecipientsConfig(LOCAL_LN_RECIPIENTS_PATH);
  const recipients = buildMixedValueRecipients(localRecipients);
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
      const valueTimeRecipient = buildMixedLightningRecipient(localRecipients, 0);
      const vsSplit = faker.number.int({ min: 1, max: 100 });
      const vsName = faker.person.fullName();
      const vsRecipientXml = buildValueRecipientXml(valueTimeRecipient.address, vsSplit, vsName, {
        type: valueTimeRecipient.type,
        ...randomValueRecipientOpts(),
      });
      valueTimeSplitBlock = `
      <podcast:valueTimeSplit startTime="${startTime}" duration="${duration}" remoteStartTime="${remoteStartTime}" remotePercentage="${remotePercentage}">
        ${vsRecipientXml}
      </podcast:valueTimeSplit>`;
    }
  }
  return [
    `<podcast:value type="lightning" method="keysend" suggested="${suggested}">`,
    `      ${recipients}${valueTimeSplitBlock}`,
    `      </podcast:value>`,
  ].join('\n');
};
