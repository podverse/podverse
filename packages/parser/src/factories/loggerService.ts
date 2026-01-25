// Re-export logger from context for backwards compatibility
import { getLoggerService } from '../context';

// Export a proxy object that delegates to the context's logger service
export const loggerService = new Proxy({} as ReturnType<typeof getLoggerService>, {
  get(_target, prop) {
    const logger = getLoggerService();
    const value = logger[prop as keyof typeof logger];
    // If it's a function, bind it to the logger instance
    if (typeof value === 'function') {
      return value.bind(logger);
    }
    return value;
  },
});
