import type { Metadata } from 'next';

import { buildAbsoluteWebUrl } from './buildAbsoluteWebUrl';
import { buildOpenGraphImage } from './buildOpenGraphImage';
import { truncateMetaDescription } from './truncateMetaDescription';

type BuildContentMetadataInput = {
  title: string | null | undefined;
  descriptionPlain: string;
  pathname: string;
  imageUrl?: string;
  type?: 'website' | 'article';
  brandName: string;
};

const getTitle = (title: string | null | undefined, brandName: string): string => {
  if (title) {
    return title;
  }

  return brandName;
};

const getDescription = (descriptionPlain: string, brandName: string): string => {
  const description = truncateMetaDescription(descriptionPlain);
  if (description) {
    return description;
  }

  return brandName;
};

export const buildContentMetadata = (input: BuildContentMetadataInput): Metadata => {
  const title = getTitle(input.title, input.brandName);
  const description = getDescription(input.descriptionPlain, input.brandName);
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
