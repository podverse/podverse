import type { Page, Request } from '@playwright/test';

export type RequestCounter = {
  getCount: () => number;
  dispose: () => void;
};

export function createRequestCounter(page: Page, pattern: RegExp): RequestCounter {
  let count = 0;
  const listener = (request: Request) => {
    if (pattern.test(request.url())) {
      count += 1;
    }
  };
  page.on('request', listener);

  return {
    getCount: () => count,
    dispose: () => {
      page.off('request', listener);
    },
  };
}
