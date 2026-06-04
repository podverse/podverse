import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { buildContentMetadata } from '../../../lib/seo/buildContentMetadata';
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

export async function generateMetadata({ params }: ClipPageProps): Promise<Metadata> {
  try {
    const { clip_id } = await params;
    const clip = await getClipForSeoPage(clip_id);
    const item = await getItemForSeoPage(clip.item.id_text);
    const channel = await getChannelForSeoPage(item.channel_id);
    const descriptionPlain = truncateMetaDescription(
      toSeoPlainText(clip.description || item.item_description?.value || item.title)
    );

    return buildContentMetadata({
      title: clip.title || item.title,
      descriptionPlain,
      pathname: `/clip/${clip.id_text}`,
      imageUrl: getItemThenChannelHeroImageUrl(item.item_images, channel.channel_images),
      type: 'article',
    });
  } catch {
    return {};
  }
}

export default async function ClipPage({ params }: ClipPageProps) {
  const { clip_id } = await params;
  const ssrClip = await getClipForSeoPage(clip_id);

  if (!ssrClip) {
    return notFound();
  }

  const ssrItem = await getItemForSeoPage(ssrClip.item.id_text);

  if (!ssrItem) {
    return notFound();
  }

  const ssrChannel = await getChannelForSeoPage(ssrItem.channel_id);

  if (!ssrChannel) {
    return notFound();
  }

  return <ClipPageClient ssrChannel={ssrChannel} ssrItem={ssrItem} ssrClip={ssrClip} />;
}
