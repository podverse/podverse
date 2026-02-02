// Re-export timerManager from context for backwards compatibility
import { getTimerManager } from '../context.js';

// Export a proxy object that delegates to the context's timer manager
export const timerManager = new Proxy({} as ReturnType<typeof getTimerManager>, {
  get(_target, prop) {
    const manager = getTimerManager();
    const value = manager[prop as keyof typeof manager];
    // If it's a function, bind it to the manager instance
    if (typeof value === 'function') {
      return value.bind(manager);
    }
    return value;
  },
});
