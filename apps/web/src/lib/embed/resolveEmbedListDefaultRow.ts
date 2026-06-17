import type { EmbedListRow } from './embedListTypes';

export function flattenEmbedListRows(groups: { rows: EmbedListRow[] }[]): EmbedListRow[] {
  return groups.flatMap((group) => group.rows);
}

export function resolveEmbedListDefaultRow(
  rows: EmbedListRow[],
  playIdText: string | null
): EmbedListRow | null {
  if (rows.length === 0) {
    return null;
  }

  if (playIdText !== null) {
    const overrideRow = rows.find((row) => row.playIdText === playIdText);

    if (overrideRow !== undefined) {
      return overrideRow;
    }
  }

  return rows[0] ?? null;
}

export function resolveEmbedListInitialRow(
  rows: EmbedListRow[],
  playIdText: string | null,
  playIdTextOverrideRow: EmbedListRow | null
): EmbedListRow | null {
  if (playIdText !== null) {
    const listMatch = rows.find((row) => row.playIdText === playIdText);

    if (listMatch !== undefined) {
      return listMatch;
    }

    if (playIdTextOverrideRow !== null && playIdTextOverrideRow.playIdText === playIdText) {
      return playIdTextOverrideRow;
    }
  }

  if (rows.length > 0) {
    return rows[0] ?? null;
  }

  return playIdTextOverrideRow;
}
