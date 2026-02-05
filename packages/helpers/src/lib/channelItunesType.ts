export enum ChannelItunesTypeItunesTypeEnum {
  Episodic = 1,
  Serial = 2,
}

export function getChannelItunesTypeItunesTypeEnumValue(
  input: string
): ChannelItunesTypeItunesTypeEnum {
  const sanitizedInput = input
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');

  const mapping: { [key: string]: ChannelItunesTypeItunesTypeEnum } = {
    episodic: ChannelItunesTypeItunesTypeEnum.Episodic,
    serial: ChannelItunesTypeItunesTypeEnum.Serial,
  };

  return mapping[sanitizedInput] ?? ChannelItunesTypeItunesTypeEnum.Episodic;
}
