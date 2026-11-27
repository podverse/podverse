import { buildPersonPath } from '@podverse/helpers';

import { getCuratedStaticPageMetadata } from '../../../lib/seo/curatedPageMetadata';
import { loadOrNotFound } from '../../../lib/ssr/loadOrNotFound';
import { getSSRAuthService } from '../../../utils/auth/ssrAuth';
import { PersonPageClient } from './PersonPageClient';

type PersonPageProps = { params: Promise<{ person_id: string }> };

export async function generateMetadata({ params }: PersonPageProps) {
  const { person_id } = await params;
  const metadata = await getCuratedStaticPageMetadata('browse');
  return { ...metadata, alternates: { canonical: buildPersonPath(person_id) } };
}

export default async function PersonPage({ params }: PersonPageProps) {
  const { person_id } = await params;
  const { ssrApiRequestService } = await getSSRAuthService();
  const person = await loadOrNotFound(() => ssrApiRequestService.reqPersonByIdText(person_id));
  return <PersonPageClient person={person} />;
}
