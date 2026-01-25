import { SharableStatusEnum } from '@podverse/helpers';

type TranslationFn = (key: string) => string;

export const SHARABLE_STATUS = {
  menuItems: (tMisc: TranslationFn) => [
    { label: tMisc('sharable_status.public'), param: 'sharable_status', value: `${SharableStatusEnum.Public}` },
    { label: tMisc('sharable_status.unlisted'), param: 'sharable_status', value: `${SharableStatusEnum.Unlisted}` },
    { label: tMisc('sharable_status.private'), param: 'sharable_status', value: `${SharableStatusEnum.Private}` },
  ],
};
