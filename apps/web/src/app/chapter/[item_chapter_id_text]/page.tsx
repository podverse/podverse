import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { buildChapterPath } from '@podverse/helpers';

import { buildContentMetadata } from '../../../lib/seo/buildContentMetadata';
import {
  getChannelForSeoPage,
  getItemChapterForSeoPage,
  getItemForSeoPage,
  getItemThenChannelHeroImageUrl,
} from '../../../lib/seo/fetchers';
import { toSeoPlainText } from '../../../lib/seo/toSeoPlainText';
import { truncateMetaDescription } from '../../../lib/seo/truncateMetaDescription';
import { ChapterClient } from './ChapterClient';

export type ChapterPageProps = {
  params: Promise<{ item_chapter_id_text: string }>;
};

export async function generateMetadata({ params }: ChapterPageProps): Promise<Metadata> {
  try {
    const { item_chapter_id_text } = await params;
    const itemChapter = await getItemChapterForSeoPage(item_chapter_id_text);

    if (!itemChapter.item_chapters_feed?.item) {
      return {};
    }

    const item = await getItemForSeoPage(itemChapter.item_chapters_feed.item.id_text);
    const channel = await getChannelForSeoPage(item.channel_id);
    const descriptionPlain = truncateMetaDescription(
      toSeoPlainText(
        `${itemChapter.title || item.title} ${item.item_description?.value || item.title}`
      )
    );

    return buildContentMetadata({
      title: `${itemChapter.title || item.title} · ${item.title}`,
      descriptionPlain,
      pathname: buildChapterPath(itemChapter.id_text),
      imageUrl: getItemThenChannelHeroImageUrl(item.item_images, channel.channel_images),
      type: 'article',
    });
  } catch {
    return {};
  }
}

export default async function ChapterPage({ params }: ChapterPageProps) {
  const { item_chapter_id_text } = await params;
  const ssrItemChapter = await getItemChapterForSeoPage(item_chapter_id_text);

  if (!ssrItemChapter.item_chapters_feed?.item) {
    return notFound();
  }

  const ssrItem = await getItemForSeoPage(ssrItemChapter.item_chapters_feed.item.id_text);

  if (!ssrItem) {
    return notFound();
  }

  const ssrChannel = await getChannelForSeoPage(ssrItem.channel_id);

  if (!ssrChannel) {
    return notFound();
  }

  return (
    <ChapterClient ssrChannel={ssrChannel} ssrItem={ssrItem} ssrItemChapter={ssrItemChapter} />
  );
}
