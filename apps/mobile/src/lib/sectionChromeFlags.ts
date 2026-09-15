export type SectionChromeEntityKind = 'channel' | 'item';

export type ChannelSectionChromeFlags = {
  hasBoosts: boolean;
  hasOfficialClips: boolean;
  hasPodroll: boolean;
};

export type ItemSectionChromeFlags = {
  hasChapters: boolean;
  hasSoundbites: boolean;
  hasTranscript: boolean;
};

export const EMPTY_CHANNEL_SECTION_CHROME_FLAGS: ChannelSectionChromeFlags = {
  hasBoosts: false,
  hasOfficialClips: false,
  hasPodroll: false,
};

export const EMPTY_ITEM_SECTION_CHROME_FLAGS: ItemSectionChromeFlags = {
  hasChapters: false,
  hasSoundbites: false,
  hasTranscript: false,
};

export const sectionChromeCacheKey = (kind: SectionChromeEntityKind, idText: string): string => {
  return `${kind}:${idText}`;
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

const readBooleanFlag = (record: Record<string, unknown>, key: string): boolean => {
  return record[key] === true;
};

export const parseChannelSectionChromeFlags = (value: unknown): ChannelSectionChromeFlags => {
  if (!isPlainRecord(value)) {
    return { ...EMPTY_CHANNEL_SECTION_CHROME_FLAGS };
  }
  return {
    hasBoosts: readBooleanFlag(value, 'hasBoosts'),
    hasOfficialClips: readBooleanFlag(value, 'hasOfficialClips'),
    hasPodroll: readBooleanFlag(value, 'hasPodroll'),
  };
};

export const parseItemSectionChromeFlags = (value: unknown): ItemSectionChromeFlags => {
  if (!isPlainRecord(value)) {
    return { ...EMPTY_ITEM_SECTION_CHROME_FLAGS };
  }
  return {
    hasChapters: readBooleanFlag(value, 'hasChapters'),
    hasSoundbites: readBooleanFlag(value, 'hasSoundbites'),
    hasTranscript: readBooleanFlag(value, 'hasTranscript'),
  };
};

export const mergeChannelSectionChromeFlags = (
  current: ChannelSectionChromeFlags | null,
  patch: Partial<ChannelSectionChromeFlags>
): ChannelSectionChromeFlags => {
  return {
    ...(current ?? EMPTY_CHANNEL_SECTION_CHROME_FLAGS),
    ...patch,
  };
};

export const mergeItemSectionChromeFlags = (
  current: ItemSectionChromeFlags | null,
  patch: Partial<ItemSectionChromeFlags>
): ItemSectionChromeFlags => {
  return {
    ...(current ?? EMPTY_ITEM_SECTION_CHROME_FLAGS),
    ...patch,
  };
};

const memory = new Map<string, unknown>();

export const hydrateSectionChromeFlagsMemory = (
  rows: readonly { cacheKey: string; flagsJson: string }[]
): void => {
  memory.clear();
  for (const row of rows) {
    if (row.cacheKey.startsWith('item:')) {
      memory.set(row.cacheKey, parseItemSectionChromeFlags(safeParseJson(row.flagsJson)));
    } else {
      memory.set(row.cacheKey, parseChannelSectionChromeFlags(safeParseJson(row.flagsJson)));
    }
  }
};

const safeParseJson = (flagsJson: string): unknown => {
  try {
    return JSON.parse(flagsJson) as unknown;
  } catch {
    return null;
  }
};

export const getCachedChannelSectionFlags = (idText: string): ChannelSectionChromeFlags | null => {
  const stored = memory.get(sectionChromeCacheKey('channel', idText));
  if (stored === undefined) {
    return null;
  }
  return parseChannelSectionChromeFlags(stored);
};

export const getCachedItemSectionFlags = (idText: string): ItemSectionChromeFlags | null => {
  const stored = memory.get(sectionChromeCacheKey('item', idText));
  if (stored === undefined) {
    return null;
  }
  return parseItemSectionChromeFlags(stored);
};

export const setCachedChannelSectionFlags = (
  idText: string,
  flags: ChannelSectionChromeFlags
): void => {
  memory.set(sectionChromeCacheKey('channel', idText), flags);
};

export const setCachedItemSectionFlags = (idText: string, flags: ItemSectionChromeFlags): void => {
  memory.set(sectionChromeCacheKey('item', idText), flags);
};

export const resetSectionChromeFlagsMemoryForTests = (): void => {
  memory.clear();
};
