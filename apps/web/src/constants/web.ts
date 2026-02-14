import { getWebOrigin } from '../config';

export const WEB = {
  get origin(): string {
    return getWebOrigin();
  },
};
