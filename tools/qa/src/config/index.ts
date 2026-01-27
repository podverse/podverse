/* eslint-disable @typescript-eslint/no-non-null-assertion -- 
 * This is a library/tool used by other apps. 
 * Env vars should be set by the consuming app before importing this module.
 * Accessing this config without setting env vars will throw at runtime.
 */

type Config = {
  userAgent: string;
  log: {
    level: string;
    dir: string;
    timer: boolean;
  };
};

export const config: Config = {
  userAgent: process.env.USER_AGENT!,
  log: {
    level: process.env.LOG_LEVEL!,
    dir: process.env.LOG_DIR ?? '',
    timer: process.env.LOG_TIMER === 'true',
  },
};
