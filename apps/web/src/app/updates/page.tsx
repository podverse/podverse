import { getTranslations } from 'next-intl/server';

import { PODVERSE_GITHUB_RELEASES_URL } from '../../constants/githubReleases';
import { UpdatesPageClient } from './UpdatesPageClient';

export default async function UpdatesPage() {
  const t = await getTranslations('updates_page');

  return (
    <UpdatesPageClient
      intro={t('intro')}
      linkLabel={t('view_releases')}
      releasesUrl={PODVERSE_GITHUB_RELEASES_URL}
      title={t('title')}
    />
  );
}
