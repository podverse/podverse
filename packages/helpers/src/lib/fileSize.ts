// Human-readable file size helper.
// Accepts bytes (number) or null/undefined and returns a string in KB, MB, or GB units.
// For values < 1KB it returns Bytes (e.g. 512 => "512 B").
// Examples: 1536 => "1.5 KB", 5_242_880 => "5 MB", 3_221_225_472 => "3 GB"
// Rounds to one decimal place for values < 10 of a unit, otherwise no decimals.

export function formatFileSize(bytes: number | null | undefined): string | null {
  if (bytes === null || bytes === undefined || bytes <= 0) {return null;}
  const KB = 1024;
  const MB = KB * 1024;
  const GB = MB * 1024;

  const format = (value: number, unit: 'KB' | 'MB' | 'GB'): string => {
    if (value >= 10) {return Math.round(value) + ' ' + unit;} // no decimals if >=10
    const withOne = parseFloat(value.toFixed(1));
    return (withOne % 1 === 0 ? Math.round(withOne) : withOne) + ' ' + unit; // trim trailing .0
  };

  if (bytes >= GB) {return format(bytes / GB, 'GB');}
  if (bytes >= MB) {return format(bytes / MB, 'MB');}
  if (bytes >= KB) {return format(bytes / KB, 'KB');}
  // Anything less than 1KB we report in bytes.

  if (bytes > 0 && bytes < KB) {return bytes + ' B';}

  return null;
}
