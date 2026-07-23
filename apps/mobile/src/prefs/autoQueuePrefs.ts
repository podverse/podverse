import AsyncStorage from '@react-native-async-storage/async-storage';

// Web persists auto-queue shuffle/repeat in the `aqc` local-settings cookie as `{ rd, rp }`.
// Mobile mirrors those key names (`aqc.rd` / `aqc.rp`) in AsyncStorage for parity. Defaults are
// both false when unset, matching web.
const AUTO_QUEUE_RANDOM_PREF_KEY = 'aqc.rd';
const AUTO_QUEUE_REPEAT_PREF_KEY = 'aqc.rp';

export type AutoQueuePrefs = {
  random: boolean;
  repeat: boolean;
};

const readBooleanPref = async (key: string): Promise<boolean> => {
  const value = await AsyncStorage.getItem(key);
  return value === 'true';
};

export const readAutoQueuePrefs = async (): Promise<AutoQueuePrefs> => {
  const [random, repeat] = await Promise.all([
    readBooleanPref(AUTO_QUEUE_RANDOM_PREF_KEY),
    readBooleanPref(AUTO_QUEUE_REPEAT_PREF_KEY),
  ]);
  return { random, repeat };
};

export const writeAutoQueueRandomPref = async (random: boolean): Promise<void> => {
  await AsyncStorage.setItem(AUTO_QUEUE_RANDOM_PREF_KEY, random ? 'true' : 'false');
};

export const writeAutoQueueRepeatPref = async (repeat: boolean): Promise<void> => {
  await AsyncStorage.setItem(AUTO_QUEUE_REPEAT_PREF_KEY, repeat ? 'true' : 'false');
};
