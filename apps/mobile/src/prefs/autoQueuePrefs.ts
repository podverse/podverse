import { getPref, setPref } from './prefsStore';

// Web persists auto-queue shuffle/repeat in the `aqc` local-settings cookie as `{ rd, rp }`.
// Mobile mirrors those key names (`aqc.rd` / `aqc.rp`) in AsyncStorage for parity. Defaults are
// both false when unset, matching web.
const AUTO_QUEUE_RANDOM_PREF_KEY = 'aqc.rd';
const AUTO_QUEUE_REPEAT_PREF_KEY = 'aqc.rp';

export type AutoQueuePrefs = {
  random: boolean;
  repeat: boolean;
};

export const readAutoQueuePrefs = async (): Promise<AutoQueuePrefs> => {
  const [random, repeat] = await Promise.all([
    getPref(AUTO_QUEUE_RANDOM_PREF_KEY),
    getPref(AUTO_QUEUE_REPEAT_PREF_KEY),
  ]);
  return {
    random: random ?? false,
    repeat: repeat ?? false,
  };
};

export const writeAutoQueueRandomPref = async (random: boolean): Promise<void> => {
  await setPref(AUTO_QUEUE_RANDOM_PREF_KEY, random);
};

export const writeAutoQueueRepeatPref = async (repeat: boolean): Promise<void> => {
  await setPref(AUTO_QUEUE_REPEAT_PREF_KEY, repeat);
};
