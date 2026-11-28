import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

import { buildClipPath, isRemovedSource } from '@podverse/helpers';

import { RemovedClipPage } from '../../../components/Clip/RemovedClipPage';
import { getConfigResolved } from '../../../config/loadPublicClientConfig.server';
import { CLIP_REMOVED_REQUEST_HEADER, isRemovedClipHttpError } from '../../../lib/clip/removedClip';
import { buildContentMetadata } from '../../../lib/seo/buildContentMetadata';
import { buildNoindexMetadata } from '../../../lib/seo/buildNoindexMetadata';
import {
  getChannelForSeoPage,
  getClipForSeoPage,
  getItemForSeoPage,
  getItemThenChannelHeroImageUrl,
} from '../../../lib/seo/fetchers';
import { toSeoPlainText } from '../../../lib/seo/toSeoPlainText';
import { truncateMetaDescription } from '../../../lib/seo/truncateMetaDescription';
import { ClipPageClient } from './ClipPageClient';

export type ClipPageProps = {
  params: Promise<{ clip_id: string }>;
};

async function visitorRemovedRequest(): Promise<boolean> {
  const requestHeaders = await headers();
  return requestHeaders.get(CLIP_REMOVED_REQUEST_HEADER) === '1';
}

export async function generateMetadata({ params }: ClipPageProps): Promise<Metadata> {
  if (await visitorRemovedRequest()) {
    return buildNoindexMetadata();
  }

  try {
    const { clip_id } = await params;
    const clip = await getClipForSeoPage(clip_id);
    if (isRemovedSource(clip)) {
      return buildNoindexMetadata(clip.title ?? undefined);
    }
    if (!clip.item) {
      return {};
    }
    const item = await getItemForSeoPage(clip.item.id_text);
    const channel = await getChannelForSeoPage(item.channel_id);
    const descriptionPlain = truncateMetaDescription(
      toSeoPlainText(clip.description || item.item_description?.value || item.title)
    );

    const brandName = (await getConfigResolved()).public.brand.name;
    return buildContentMetadata({
      title: clip.title || item.title,
      descriptionPlain,
      pathname: buildClipPath(clip.id_text),
      imageUrl: getItemThenChannelHeroImageUrl(item.item_images, channel.channel_images),
      type: 'article',
      brandName,
    });
  } catch (error) {
    if (isRemovedClipHttpError(error)) {
      return buildNoindexMetadata();
    }
    return {};
  }
}

export default async function ClipPage({ params }: ClipPageProps) {
  if (await visitorRemovedRequest()) {
    return <RemovedClipPage kind="visitor" />;
  }

  const { clip_id } = await params;

  try {
    const ssrClip = await getClipForSeoPage(clip_id);

    if (isRemovedSource(ssrClip)) {
      return <RemovedClipPage kind="owner" clip={ssrClip} />;
    }

    if (!ssrClip.item) {
      return notFound();
    }

    const ssrItem = await getItemForSeoPage(ssrClip.item.id_text);
    const ssrChannel = await getChannelForSeoPage(ssrItem.channel_id);

    return <ClipPageClient ssrChannel={ssrChannel} ssrItem={ssrItem} ssrClip={ssrClip} />;
  } catch (error) {
    if (isRemovedClipHttpError(error)) {
      return <RemovedClipPage kind="visitor" />;
    }
    throw error;
  }
}
