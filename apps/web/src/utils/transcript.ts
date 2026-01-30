import { TranscriptRow } from '@podverse/helpers';

/**
 * Parses transcript string into rows. Transcriptator (he, xmldom, etc.) is
 * loaded only when this is first called (transcript tab), not in the main bundle.
 */
export const getTranscriptRowsFromTranscriptString = async (
  data?: string | null
): Promise<TranscriptRow[]> => {
  if (!data) {
    return [];
  }

  try {
    const { parseTranscriptRows } = await import('./transcriptParser');
    return parseTranscriptRows(data) ?? [];
  } catch (error) {
    console.error('getParsedTranscript error:', error);
    return [];
  }
};
