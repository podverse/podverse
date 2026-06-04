import type { Metadata } from 'next';

import { getConfig } from '../../config';
import { buildAbsoluteWebUrl } from './buildAbsoluteWebUrl';
import { buildOpenGraphImage } from './buildOpenGraphImage';
import { truncateMetaDescription } from './truncateMetaDescription';

type BuildContentMetadataInput = {
  title: string | null | undefined;
  descriptionPlain: string;
  pathname: string;
  imageUrl?: string;
  type?: 'website' | 'article';
};

const getTitle = (title: string | null | undefined): string => {
  if (title) {
    return title;
  }

  return getConfig().public.brand.name;
};

const getDescription = (descriptionPlain: string): string => {
  const description = truncateMetaDescription(descriptionPlain);
  if (description) {
    return description;
  }

  return getConfig().public.brand.name;
};

export const buildContentMetadata = (input: BuildContentMetadataInput): Metadata => {
  const title = getTitle(input.title);
  const description = getDescription(input.descriptionPlain);
  const canonical = buildAbsoluteWebUrl(input.pathname);
  const image = buildOpenGraphImage(input.imageUrl);

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      type: input.type ?? 'article',
      url: canonical,
      images: [{ url: image }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
};

export type { BuildContentMetadataInput };
