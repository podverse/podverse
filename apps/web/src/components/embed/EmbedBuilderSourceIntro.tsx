import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type { EmbedBuilderSourceIntroModel } from '../../lib/embed/fetchEmbedBuilderSourceIntro';
import type { EmbedBuilderSourceKind } from '../../lib/embed/resolveEmbedBuilderSourceKind';
import { embedBuilderOrientTranslationKeys } from '../../lib/embed/resolveEmbedBuilderSourceKind';

import styles from './EmbedBuilderSourceIntro.module.scss';

type EmbedBuilderSourceIntroProps = {
  sourceIntro: EmbedBuilderSourceIntroModel;
};

async function resolveEmbedBuilderTypeLabel(
  kind: EmbedBuilderSourceKind,
  tMedia: Awaited<ReturnType<typeof getTranslations<'media'>>>,
  tFeatures: Awaited<ReturnType<typeof getTranslations<'features'>>>,
  tInfo: Awaited<ReturnType<typeof getTranslations<'info'>>>
): Promise<string> {
  switch (kind) {
    case 'podcast':
      return tMedia('podcast.podcast');
    case 'album':
      return tMedia('music.album');
    case 'episode':
      return tMedia('podcast.episode');
    case 'track':
      return tMedia('music.track');
    case 'clip':
      return tFeatures('clip.clip');
    case 'chapter':
      return tInfo('chapter.chapter');
    case 'official_clip':
      return tInfo('soundbite.official_clip');
    case 'playlist':
      return tFeatures('playlist.playlist');
    default:
      return tFeatures('embed_builder_orient_default_type');
  }
}

export async function EmbedBuilderSourceIntro({ sourceIntro }: EmbedBuilderSourceIntroProps) {
  const tFeatures = await getTranslations('features');
  const tMedia = await getTranslations('media');
  const tInfo = await getTranslations('info');
  const typeLabel = await resolveEmbedBuilderTypeLabel(sourceIntro.kind, tMedia, tFeatures, tInfo);
  const { helpKey } = embedBuilderOrientTranslationKeys(sourceIntro.kind);

  return (
    <section
      aria-labelledby="embed-builder-orientation-title"
      className={styles.intro}
      data-testid="embed-builder-orientation"
    >
      <h2 className={styles.heading} id="embed-builder-orientation-title">
        {tFeatures('embed_builder_orient_heading', {
          title: sourceIntro.title,
          type_label: typeLabel,
        })}
      </h2>
      <p className={styles.description}>{tFeatures(helpKey)}</p>
      <Link
        className={styles.sourceLink}
        href={sourceIntro.sourcePagePath}
        rel="noopener noreferrer"
        target="_blank"
      >
        {tFeatures('embed_builder_orient_view_source', { type_label: typeLabel })}
      </Link>
    </section>
  );
}
