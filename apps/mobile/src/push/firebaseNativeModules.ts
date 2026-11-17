/**
 * Native Firebase packages. Required only after this binary's Firebase module is registered.
 * Kept separate so tests can substitute the packages without loading React Native.
 */
export const readFirebaseAppModule = (): unknown => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded only after the native module is registered
  return require('@react-native-firebase/app');
};

export const readFirebaseMessagingModule = (): unknown => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded only after the native module is registered
  return require('@react-native-firebase/messaging');
};
