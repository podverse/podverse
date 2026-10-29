import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getSignInPushPromptShownStorageKey,
  SIGN_IN_PUSH_PROMPT_SHOWN_VALUE,
} from '@podverse/helpers/notificationPush';

/**
 * Whether this device has shown the sign-in push dialog to an account. Keyed by account id text;
 * sign-out leaves it so the same account is not asked again on this phone. An unreadable store
 * reads as not shown.
 */
export const hasShownSignInPushPrompt = async (accountIdText: string): Promise<boolean> => {
  try {
    const raw = await AsyncStorage.getItem(getSignInPushPromptShownStorageKey(accountIdText));
    return raw === SIGN_IN_PUSH_PROMPT_SHOWN_VALUE;
  } catch (error) {
    console.warn('Could not read the sign-in push prompt flag', error);
    return false;
  }
};

export const markSignInPushPromptShown = async (accountIdText: string): Promise<void> => {
  await AsyncStorage.setItem(
    getSignInPushPromptShownStorageKey(accountIdText),
    SIGN_IN_PUSH_PROMPT_SHOWN_VALUE
  );
};
