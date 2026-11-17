import * as FileSystem from 'expo-file-system/legacy';

import { getMobileConfig } from '../../config';

const CHECK_INTERVAL_MS = 500;

let generation = 0;
let markerText = 'waiting';
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

export const v4DownloadFixtureRemainderLabel = (stillPresent: readonly string[]): string =>
  stillPresent.length === 0 ? 'none' : stillPresent.join(',');

export const getV4DownloadFixtureFilesMarker = (): string => markerText;

export const subscribeV4DownloadFixtureFilesMarker = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const publish = (next: string): void => {
  if (next === markerText) {
    return;
  }
  markerText = next;
  for (const listener of listeners) {
    listener();
  }
};

const stop = (): void => {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
};

export const beginV4DownloadFixtureFilesCheck = (names: readonly string[]): void => {
  if (!__DEV__ || !getMobileConfig().isE2e) {
    return;
  }
  generation += 1;
  const generationThisRun = generation;
  stop();
  let tickInFlight = false;

  const tick = async (): Promise<void> => {
    if (generation !== generationThisRun || tickInFlight) {
      return;
    }
    tickInFlight = true;
    try {
      const root = FileSystem.documentDirectory;
      if (root === null) {
        return;
      }
      const stillPresent: string[] = [];
      for (const name of names) {
        if (generation !== generationThisRun) {
          return;
        }
        const info = await FileSystem.getInfoAsync(`${root}${name}`);
        if (info.exists) {
          stillPresent.push(name);
        }
      }
      if (generation !== generationThisRun) {
        return;
      }
      const label = v4DownloadFixtureRemainderLabel(stillPresent);
      publish(label);
      if (label === 'none') {
        stop();
      }
    } catch {
      return;
    } finally {
      tickInFlight = false;
    }
  };

  void tick();
  timer = setInterval(() => {
    void tick();
  }, CHECK_INTERVAL_MS);
};
