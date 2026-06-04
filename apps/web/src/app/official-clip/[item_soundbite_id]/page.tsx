import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { buildContentMetadata } from '../../../lib/seo/buildContentMetadata';
import {
  getChannelForSeoPage,
  getItemForSeoPage,
  getItemSoundbiteForSeoPage,
  getItemThenChannelHeroImageUrl,
} from '../../../lib/seo/fetchers';
import { toSeoPlainText } from '../../../lib/seo/toSeoPlainText';
import { truncateMetaDescription } from '../../../lib/seo/truncateMetaDescription';
import { OfficialClipClient } from './OfficialClipClient';

export type OfficialClipPageProps = {
  params: Promise<{ item_soundbite_id: string }>;
};

export async function generateMetadata({ params }: OfficialClipPageProps): Promise<Metadata> {
  try {
    const { item_soundbite_id } = await params;
    const itemSoundbite = await getItemSoundbiteForSeoPage(item_soundbite_id);

    if (!itemSoundbite.item) {
      return {};
    }

    const item = await getItemForSeoPage(itemSoundbite.item.id_text);
    const channel = await getChannelForSeoPage(item.channel_id);
    const descriptionPlain = truncateMetaDescription(
      toSeoPlainText(item.item_description?.value || item.title)
    );

    return buildContentMetadata({
      title: itemSoundbite.title || item.title,
      descriptionPlain,
      pathname: `/official-clip/${itemSoundbite.id_text}`,
      imageUrl: getItemThenChannelHeroImageUrl(item.item_images, channel.channel_images),
      type: 'article',
    });
  } catch {
    return {};
  }
}

export default async function OfficialClipPage({ params }: OfficialClipPageProps) {
  const { item_soundbite_id } = await params;
  const ssrItemSoundbite = await getItemSoundbiteForSeoPage(item_soundbite_id);

  if (!ssrItemSoundbite.item) {
    return notFound();
  }

  const ssrItem = await getItemForSeoPage(ssrItemSoundbite.item.id_text);

  if (!ssrItem) {
    return notFound();
  }

  const ssrChannel = await getChannelForSeoPage(ssrItem.channel_id);

  if (!ssrChannel) {
    return notFound();
  }

  return (
    <OfficialClipClient
      ssrChannel={ssrChannel}
      ssrItem={ssrItem}
      ssrItemSoundbite={ssrItemSoundbite}
    />
  );
}
