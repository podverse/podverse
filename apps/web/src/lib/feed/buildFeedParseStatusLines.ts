export type FeedParseStatusInput = {
  lastFinishedParseTime: string | null;
  lastFailedParseTime: string | null;
};

export type FeedParseStatusLabels = {
  lastParsed: (date: string) => string;
  lastFailedParse: (date: string) => string;
  neverFullyParsed: string;
};

export type FeedParseStatusLines = {
  lines: string[];
};

export function buildFeedParseStatusLines(
  input: FeedParseStatusInput,
  formatDate: (iso: string) => string,
  labels: FeedParseStatusLabels
): FeedParseStatusLines {
  const successAt = input.lastFinishedParseTime;
  const failedAt = input.lastFailedParseTime;
  const showFailure =
    failedAt !== null &&
    failedAt !== undefined &&
    (successAt === null || successAt === undefined || new Date(failedAt) > new Date(successAt));

  const lines: string[] = [];

  if (successAt !== null && successAt !== undefined) {
    lines.push(labels.lastParsed(formatDate(successAt)));
  }

  if (showFailure && failedAt !== null && failedAt !== undefined) {
    lines.push(labels.lastFailedParse(formatDate(failedAt)));
  }

  if (lines.length === 0) {
    lines.push(labels.neverFullyParsed);
  }

  return { lines };
}
