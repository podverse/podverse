import { LoggerService } from './logger';

export class TimerManager {
  private timers: Map<string, number>;
  public shouldLogTimer: boolean;
  private logger: LoggerService;

  constructor(shouldLogTimer: boolean, logger: LoggerService) {
    this.timers = new Map();
    this.shouldLogTimer = shouldLogTimer;
    this.logger = logger;
  }

  start(label: string): void {
    if (this.shouldLogTimer) {
      this.timers.set(label, performance.now());
    }
  }

  end(label: string, preventLog?: boolean): number {
    if (this.shouldLogTimer) {
      const startTime = this.timers.get(label);
      if (startTime !== undefined) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        if (!preventLog) {
          this.logger.info(`${label} took ${duration}ms`);
        }
        this.timers.delete(label);
        return duration;
      }
    }
    return 0;
  }

  endAll(): void {
    if (this.shouldLogTimer) {
      this.timers.forEach((startTime, label) => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        this.logger.info(`${label} took ${duration}ms`);
      });
      this.timers.clear();
    }
  }
}
