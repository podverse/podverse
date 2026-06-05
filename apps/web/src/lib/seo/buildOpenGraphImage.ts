import { getConfig } from '../../config';
import { ASSETS } from '../../constants/assets';
import { buildAbsoluteWebUrl } from './buildAbsoluteWebUrl';

const buildDefaultOpenGraphImage = (): string => {
  const fallbackLogo = getConfig().public.brand.logoLight || ASSETS.IMAGES.BRANDING.BRAND.LOGO;
  return buildAbsoluteWebUrl(fallbackLogo);
};

export const buildOpenGraphImage = (imageUrl?: string): string => {
  const normalized = imageUrl?.trim();
  if (!normalized) {
    return buildDefaultOpenGraphImage();
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  return buildAbsoluteWebUrl(normalized);
};
