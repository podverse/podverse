export enum SharableStatusEnum {
  Public = 1,
  Unlisted = 2,
  Private = 3,
}

export function getSharableStatusIdsForProfileType(type: 'global' | 'subscribed'): number[] {
  switch (type) {
    case 'global':
      return [SharableStatusEnum.Public];
    case 'subscribed':
      return [SharableStatusEnum.Public, SharableStatusEnum.Unlisted];
    default:
      return [SharableStatusEnum.Public];
  }
}
