export const getRecordValue = <T>(
  record: Record<string, T> | undefined,
  key: string
): T | undefined => {
  if (!record) {
    return undefined;
  }

  if (Object.hasOwn(record, key)) {
    return record[key];
  }

  return undefined;
};
