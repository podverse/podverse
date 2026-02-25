// Config types for app-level configuration
export * from './config/index.js';

// Factory function to create the Firebase context
export { createFirebaseContext } from './factory.js';
export type { FirebaseContext } from './factory.js';

// Service exports
export * from './services/google/firebase/index.js';
