import type { TranscriptRow } from '@podverse/helpers';
import { formatHHMMSS } from '@podverse/helpers';
import { convertFile } from 'transcriptator';
import { TimestampFormatter } from 'transcriptator/timestamp';

/**
 * Parses transcript string into rows. Loaded only when transcript tab is used
 * (via dynamic import from transcript.ts) to keep transcriptator out of main bundle.
 */
export function parseTranscriptRows(data: string): TranscriptRow[] {
  TimestampFormatter.registerCustomFormatter(formatHHMMSS);
  const parsedTranscript = convertFile(data);

  let previousSpeaker = '';
  for (const row of parsedTranscript) {
    if (row?.speaker && previousSpeaker === row.speaker) {
      row.speaker = '';
    } else if (row?.speaker) {
      previousSpeaker = row.speaker;
    }
  }

  return parsedTranscript;
}
