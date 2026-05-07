// Human-readable file size helper.
// Accepts bytes (number) or null/undefined and returns a string in B, KB, MB, GB, or TB units.
// For values < 1KB it returns Bytes (e.g. 512 => "512 B").
// Examples: 1536 => "1.5 KB", 5_242_880 => "5 MB", 3_221_225_472 => "3 GB"
// Rounds to one decimal place for values < 10 of a unit, otherwise no decimals.

export type FormatFileSizeOptions = {
  /** When set, `bytes === 0` returns this string instead of null. */
  zeroLabel?: string;
};

export function formatFileSize(
  bytes: number | null | undefined,
  options?: FormatFileSizeOptions
): string | null {
  if (bytes === null || bytes === undefined) {
    return null;
  }
  if (bytes < 0) {
    return null;
  }
  if (bytes === 0) {
    return options?.zeroLabel ?? null;
  }

  const KB = 1024;
  const MB = KB * 1024;
  const GB = MB * 1024;
  const TB = GB * 1024;

  const format = (value: number, unit: 'KB' | 'MB' | 'GB' | 'TB'): string => {
    if (value >= 10) {
      return Math.round(value) + ' ' + unit;
    }
    const withOne = parseFloat(value.toFixed(1));
    return (withOne % 1 === 0 ? Math.round(withOne) : withOne) + ' ' + unit;
  };

  if (bytes >= TB) {
    return format(bytes / TB, 'TB');
  }
  if (bytes >= GB) {
    return format(bytes / GB, 'GB');
  }
  if (bytes >= MB) {
    return format(bytes / MB, 'MB');
  }
  if (bytes >= KB) {
    return format(bytes / KB, 'KB');
  }
  if (bytes > 0 && bytes < KB) {
    return bytes + ' B';
  }

  return null;
}
