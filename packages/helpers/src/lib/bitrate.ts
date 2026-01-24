// Returns a structured bitrate allowing callers to translate value and unit separately.
// Mbps threshold: treat >= 1,000,000 as Mbps, else kbps. Value rounded to nearest integer.
export interface FormattedBitrate {
  value: number; // integer representation (already scaled to unit)
  unit: 'kbps' | 'Mbps';
}

export function formatBitrate(bitrate: number): FormattedBitrate {
  if (bitrate >= 1_000_000) {
    return { value: Math.round(bitrate / 1_000_000), unit: 'Mbps' };
  }
  return { value: Math.round(bitrate / 1_000), unit: 'kbps' };
}
