export interface DTOItemTranscript {
  id: number;
  item_id: number;
  url: string;
  type: string;
  language?: string | null;
  rel?: string | null;
}

export interface TranscriptRow {
  line?: number;
  startTime: number;
  startTimeFormatted: string | null;
  endTime: number;
  endTimeFormatted: string | null;
  body: string;
  speaker?: string;
}
