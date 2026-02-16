import type { ImageStorageService } from '@workers/types/imageStorage.js';

let imageStorageService: ImageStorageService | null = null;

export const setImageStorageService = (service: ImageStorageService): void => {
  imageStorageService = service;
};

export const getImageStorageService = (): ImageStorageService => {
  if (imageStorageService === null) {
    throw new Error('ImageStorageService not initialized');
  }
  return imageStorageService;
};
