import type { Metadata } from 'next';

import { getConfig } from '../../config';
import { buildAbsoluteWebUrl } from './buildAbsoluteWebUrl';
import { buildOpenGraphImage } from './buildOpenGraphImage';
import { truncateMetaDescription } from './truncateMetaDescription';

type BuildContentMetadataInput = {
  title: string;
  descriptionPlain: string;
  pathname: string;
  imageUrl?: string;
  type?: 'website' | 'article';
};

const getDescription = (descriptionPlain: string): string => {
  const description = truncateMetaDescription(descriptionPlain);
  if (description) {
    return description;
  }

  return getConfig().public.brand.name;
};

export const buildContentMetadata = (input: BuildContentMetadataInput): Metadata => {
  const description = getDescription(input.descriptionPlain);
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
      type: input.type ?? 'article',
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

export type { BuildContentMetadataInput };
