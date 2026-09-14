let isPlayingLocally = false;

export const readIsPlayingLocallyForSync = (): boolean => isPlayingLocally;

export const writeIsPlayingLocallyForSync = (isPlaying: boolean): void => {
  isPlayingLocally = isPlaying;
};
