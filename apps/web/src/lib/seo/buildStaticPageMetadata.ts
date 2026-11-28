import type { Metadata } from 'next';

import { buildAbsoluteWebUrl } from './buildAbsoluteWebUrl';
import { buildOpenGraphImage } from './buildOpenGraphImage';
import { truncateMetaDescription } from './truncateMetaDescription';

type BuildStaticPageMetadataInput = {
  title: string;
  descriptionPlain: string;
  pathname: string;
  imageUrl?: string;
  brandName: string;
};

const getDescription = (descriptionPlain: string, brandName: string): string => {
  const description = truncateMetaDescription(descriptionPlain);
  if (description) {
    return description;
  }

  return brandName;
};

export const buildStaticPageMetadata = (input: BuildStaticPageMetadataInput): Metadata => {
  const description = getDescription(input.descriptionPlain, input.brandName);
  const canonical = buildAbsoluteWebUrl(input.pathname);
  const image = buildOpenGraphImage(input.imageUrl);

  return {
    title: input.title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: input.title,
      description,
      type: 'website',
      url: canonical,
      images: [{ url: image }],
    },
    twitter: {
      card: 'summary_large_image',
      title: input.title,
      description,
      images: [image],
    },
  };
};

export type { BuildStaticPageMetadataInput };
