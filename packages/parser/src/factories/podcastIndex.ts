// Re-export podcastIndexService from context for backwards compatibility
import { getPodcastIndexService } from '../context';

// Export a proxy object that delegates to the context's podcast index service
export const podcastIndexService = new Proxy({} as ReturnType<typeof getPodcastIndexService>, {
  get(_target, prop) {
    const service = getPodcastIndexService();
    const value = service[prop as keyof typeof service];
    // If it's a function, bind it to the service instance
    if (typeof value === 'function') {
      return value.bind(service);
    }
    return value;
  },
});
