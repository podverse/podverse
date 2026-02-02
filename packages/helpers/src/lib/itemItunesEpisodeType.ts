export enum ItemItunesEpisodeTypeEnum {
  Full = 1,
  Trailer = 2,
  Bonus = 3,
}

export function getItemItunesEpisodeTypeEnumValue(input: string): ItemItunesEpisodeTypeEnum {
  const sanitizedInput = input
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');

  const mapping: { [key: string]: ItemItunesEpisodeTypeEnum } = {
    full: ItemItunesEpisodeTypeEnum.Full,
    trailer: ItemItunesEpisodeTypeEnum.Trailer,
    bonus: ItemItunesEpisodeTypeEnum.Bonus,
  };

  return mapping[sanitizedInput] ?? ItemItunesEpisodeTypeEnum.Full;
}
