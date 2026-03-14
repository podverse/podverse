import type { BaseConfig } from '@workers/config/index.js';

import { TimerManager } from '@podverse/helpers-backend';

import { getLoggerService } from './loggerService.js';

let instance: TimerManager | null = null;

export function setTimerManager(baseConfig: BaseConfig): void {
  instance = new TimerManager(baseConfig.log.timer, getLoggerService());
}

export function getTimerManager(): TimerManager {
  if (instance === null) {
    throw new Error('TimerManager not initialized; call setTimerManager from runApp first');
  }
  return instance;
}
