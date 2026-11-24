import { formatDateTimeAbbrev } from '@podverse/helpers';

import type { MbrssMessagesScope } from './boostEligibility.js';
import type { MetaBoost } from './metaBoost.js';
import type {
  MbrssV1PublicMessagesScope,
  PublicBoostMessage,
  PublicBoostMessagesPage,
} from './publicMessages.js';
import { fetchMbrssV1PublicMessages, fetchMbV1PublicMessages } from './publicMessages.js';

const isSatoshisUnit = (amountUnit: string | null): boolean => {
  if (amountUnit === null) {
    return false;
  }
  const normalized = amountUnit.trim().toLowerCase();
  return normalized === 'satoshis';
};

const joinUnknownAmountParts = (
  amount: string,
  currencyRaw: string,
  amountUnitRaw: string
): string => {
  const segments = [amount];
  const currencyValue = currencyRaw.trim();
  const amountUnitValue = amountUnitRaw.trim();
  if (currencyValue !== '') {
    segments.push(currencyValue);
  }
  if (amountUnitValue !== '') {
    segments.push(amountUnitValue);
  }
  return segments.join(' ');
};

export type FormatPublicBoostAmountLabels = {
  satoshisDenominationLabel: string;
  btcNonSatoshiSuffix: string;
};

/**
 * Formats currency + amount for public boost message rows (aligned with Metaboost list card logic).
 */
export const formatPublicBoostAmountLine = (
  message: Pick<PublicBoostMessage, 'amount' | 'currency' | 'amountUnit'>,
  locale: string,
  labels: FormatPublicBoostAmountLabels
): string | null => {
  const rawAmount = message.amount?.trim() ?? '';
  if (rawAmount === '') {
    return null;
  }

  const currencyRaw = message.currency?.trim() ?? '';
  const currency = currencyRaw.toUpperCase();
  const amountUnitRaw = message.amountUnit?.trim() ?? '';

  if (currency === 'BTC') {
    if (isSatoshisUnit(message.amountUnit)) {
      return `${rawAmount} ${labels.satoshisDenominationLabel}`;
    }
    return `${rawAmount} ${labels.btcNonSatoshiSuffix}`;
  }

  if (currency === 'USD') {
    const n = Number(rawAmount);
    if (Number.isFinite(n)) {
      return new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(n);
    }
    return `${rawAmount} USD`;
  }

  return joinUnknownAmountParts(rawAmount, currencyRaw, amountUnitRaw);
};

type MbrssV1MessagesSource = {
  type: 'mbrss-v1';
  publicMessagesUrl: string;
  scope:
    | { type: 'bucket' }
    | { type: 'channel'; podcastGuid: string }
    | { type: 'item'; itemGuid: string }
    | { type: 'artist'; podcastGuid: string }
    | { type: 'album'; podcastGuid: string }
    | { type: 'track'; itemGuid: string }
    | { type: 'livestream'; itemGuid: string };
};

type MbV1MessagesSource = {
  type: 'mb-v1';
  publicMessagesUrl: string;
};

export type BoostMessagesSource = MbrssV1MessagesSource | MbV1MessagesSource;

const toMbrssApiScope = (scope: MbrssV1MessagesSource['scope']): MbrssV1PublicMessagesScope => {
  if (scope.type === 'artist' || scope.type === 'album') {
    return { type: 'channel', podcastGuid: scope.podcastGuid };
  }
  if (scope.type === 'track' || scope.type === 'livestream') {
    return { type: 'item', itemGuid: scope.itemGuid };
  }
  return scope;
};

const normalizeMessagesPage = (data: PublicBoostMessagesPage): PublicBoostMessagesPage => ({
  messages: data.messages,
  page: data.page,
  limit: data.limit,
  total: data.total,
  totalPages: data.totalPages,
});

export const PUBLIC_BOOST_MESSAGES_PAGE_LIMIT = 20;

export type PublicBoostMessagesPageFetcher = (params: {
  page: number;
  limit: number;
}) => Promise<PublicBoostMessagesPage>;

export const createBoostMessagesPageFetcher = (
  source: BoostMessagesSource,
  defaultLimit = PUBLIC_BOOST_MESSAGES_PAGE_LIMIT
): PublicBoostMessagesPageFetcher => {
  return async ({ page, limit }) => {
    const requestedLimit = limit > 0 ? limit : defaultLimit;
    if (source.type === 'mb-v1') {
      return normalizeMessagesPage(
        await fetchMbV1PublicMessages(source.publicMessagesUrl, {
          page,
          limit: requestedLimit,
        })
      );
    }
    const apiScope = toMbrssApiScope(source.scope);
    return normalizeMessagesPage(
      await fetchMbrssV1PublicMessages(source.publicMessagesUrl, apiScope, {
        page,
        limit: requestedLimit,
      })
    );
  };
};

export type PublicBoostMessagesScopeType =
  'channel' | 'artist' | 'album' | 'item' | 'track' | 'livestream';

export type PublicBoostMessagesCapabilityStatus = 'idle' | 'loading' | 'success' | 'error';

const messagesScopeForFetcher = (
  scopeType: PublicBoostMessagesScopeType,
  messagesScope: MbrssMessagesScope
): MbrssV1MessagesSource['scope'] | null => {
  if (scopeType === 'channel' || scopeType === 'artist' || scopeType === 'album') {
    if (messagesScope.type !== 'channel') {
      return null;
    }
    if (scopeType === 'channel') {
      return { type: 'channel', podcastGuid: messagesScope.podcastGuid };
    }
    return { type: scopeType, podcastGuid: messagesScope.podcastGuid };
  }

  if (messagesScope.type !== 'item') {
    return null;
  }
  if (scopeType === 'item') {
    return { type: 'item', itemGuid: messagesScope.itemGuid };
  }
  return { type: scopeType, itemGuid: messagesScope.itemGuid };
};

export const createPublicBoostMessagesPageFetcher = (input: {
  fetchAllowed: boolean;
  metaBoost: MetaBoost | null;
  messagesScope: MbrssMessagesScope | null;
  capabilityStatus: PublicBoostMessagesCapabilityStatus;
  publicMessagesUrl: string | null;
  scopeType: PublicBoostMessagesScopeType;
}): PublicBoostMessagesPageFetcher | null => {
  if (
    input.fetchAllowed === false ||
    input.metaBoost === null ||
    input.metaBoost.standard !== 'mbrss-v1' ||
    input.messagesScope === null ||
    input.capabilityStatus !== 'success' ||
    input.publicMessagesUrl === null
  ) {
    return null;
  }

  const scope = messagesScopeForFetcher(input.scopeType, input.messagesScope);
  if (scope === null) {
    return null;
  }

  return createBoostMessagesPageFetcher({
    type: 'mbrss-v1',
    publicMessagesUrl: input.publicMessagesUrl,
    scope,
  });
};

export type PublicBoostBreadcrumbTarget =
  { kind: 'item'; itemGuid: string } | { kind: 'channel' } | { kind: 'none' };

export const resolvePublicBoostBreadcrumbTarget = (
  message: PublicBoostMessage,
  currentPodcastGuid: string | null
): PublicBoostBreadcrumbTarget => {
  const context = message.breadcrumbContext;
  if (context === null || context.isSubBucket !== true) {
    return { kind: 'none' };
  }
  if (context.itemGuid !== null && context.itemGuid !== '') {
    return { kind: 'item', itemGuid: context.itemGuid };
  }
  if (
    context.podcastGuid !== null &&
    context.podcastGuid !== '' &&
    currentPodcastGuid !== null &&
    currentPodcastGuid !== '' &&
    context.podcastGuid === currentPodcastGuid
  ) {
    return { kind: 'channel' };
  }
  return { kind: 'none' };
};

export type PublicBoostMessageRow = {
  key: string;
  senderName: string;
  createdAt: string;
  dateLabel: string;
  showAmountRow: boolean;
  amountPrimary: string | null;
  appName: string | null;
  body: string | null;
  breadcrumb: {
    podcastLabel: string;
    itemLabel: string | null;
    target: PublicBoostBreadcrumbTarget;
  } | null;
};

const nonEmptyString = (value: string | null): string | null => {
  if (value === null || value === '') {
    return null;
  }
  return value;
};

export const toPublicBoostMessageRow = (
  message: PublicBoostMessage,
  options: {
    locale: string;
    anonymousLabel: string;
    headingFallback: string;
    currentPodcastGuid: string | null;
    satoshisDenominationLabel: string;
    btcNonSatoshiSuffix: string;
  }
): PublicBoostMessageRow => {
  const trimmedSender = message.senderName?.trim() ?? '';
  const senderName = trimmedSender !== '' ? trimmedSender : options.anonymousLabel;
  const appName = message.appName.trim() !== '' ? message.appName : null;
  const amountLine = formatPublicBoostAmountLine(message, options.locale, {
    satoshisDenominationLabel: options.satoshisDenominationLabel,
    btcNonSatoshiSuffix: options.btcNonSatoshiSuffix,
  });
  const showAmountRow = amountLine !== null || appName !== null;
  const amountPrimary = showAmountRow ? (amountLine ?? '\u2014') : null;
  const context = message.breadcrumbContext;
  const breadcrumb =
    context === null || context.isSubBucket !== true
      ? null
      : {
          podcastLabel: nonEmptyString(context.podcastLabel) ?? options.headingFallback,
          itemLabel: nonEmptyString(context.itemLabel),
          target: resolvePublicBoostBreadcrumbTarget(message, options.currentPodcastGuid),
        };

  return {
    key: message.messageGuid !== '' ? message.messageGuid : message.id,
    senderName,
    createdAt: message.createdAt,
    dateLabel: formatDateTimeAbbrev(message.createdAt, options.locale),
    showAmountRow,
    amountPrimary,
    appName,
    body: nonEmptyString(message.body),
    breadcrumb,
  };
};
