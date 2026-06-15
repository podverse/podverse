import type { EmbedConnectionQualityTarget } from './resolveEmbedBestFitEnclosure';

// Minimal shape of the experimental Network Information API. It is read-only and
// only present on Chromium-based and Android browsers; Safari and Firefox omit it.
interface EmbedNetworkInformation {
  readonly effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  readonly saveData?: boolean;
  readonly downlink?: number;
}

declare global {
  interface Navigator {
    readonly connection?: EmbedNetworkInformation;
  }
}

// Prefer a balanced mp3 encoding (and 720p video) by default rather than the
// highest-quality file. We never probe or measure bandwidth — we only read the
// browser's Network Information API when present, and degrade to the default
// otherwise so unsupported browsers still get a reasonable choice.
const DEFAULT_TARGET: EmbedConnectionQualityTarget = {
  audioMaxKbps: 128,
  videoMaxHeight: 720,
};

const MODERATE_TARGET: EmbedConnectionQualityTarget = {
  audioMaxKbps: 96,
  videoMaxHeight: 480,
};

const CONSTRAINED_TARGET: EmbedConnectionQualityTarget = {
  audioMaxKbps: 64,
  videoMaxHeight: 360,
};

export function resolveEmbedConnectionQualityTarget(): EmbedConnectionQualityTarget {
  if (typeof navigator === 'undefined') {
    return DEFAULT_TARGET;
  }

  const connection = navigator.connection;
  if (connection === null || connection === undefined) {
    return DEFAULT_TARGET;
  }

  // Respect the user's explicit Data Saver preference above all else.
  if (connection.saveData === true) {
    return CONSTRAINED_TARGET;
  }

  switch (connection.effectiveType) {
    case 'slow-2g':
    case '2g':
      return CONSTRAINED_TARGET;
    case '3g':
      return MODERATE_TARGET;
    default:
      return DEFAULT_TARGET;
  }
}
