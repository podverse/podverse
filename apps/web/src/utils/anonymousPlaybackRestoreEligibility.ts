export function canAttemptAnonymousPlaybackRestore(input: {
  skipAnonymousPlaybackRestore: boolean;
  loggedInAccount: unknown;
  restoreAlreadyStarted: boolean;
  allowsAnonymousFeatureStorage: boolean;
}): boolean {
  if (input.skipAnonymousPlaybackRestore) {
    return false;
  }

  if (input.loggedInAccount) {
    return false;
  }

  if (input.restoreAlreadyStarted) {
    return false;
  }

  if (!input.allowsAnonymousFeatureStorage) {
    return false;
  }

  return true;
}
