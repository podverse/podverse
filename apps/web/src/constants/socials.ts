import { getConfig } from '../config';

export const SOCIALS = {
  get ACTIVITY_PUB(): string {
    return getConfig().public.socials.activityPub;
  },
  get DISCORD(): string {
    return getConfig().public.socials.discord;
  },
  get GITHUB(): string {
    return getConfig().public.socials.github;
  },
  get MATRIX(): string {
    return getConfig().public.socials.matrix;
  },
  get X(): string {
    return getConfig().public.socials.x;
  },
};
