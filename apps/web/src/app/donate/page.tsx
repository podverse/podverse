import { getCuratedStaticPageMetadata } from '../../lib/seo/curatedPageMetadata';
import { DonatePageClient } from './DonatePageClient';

export async function generateMetadata() {
  return getCuratedStaticPageMetadata('donate');
}

export default function DonatePage() {
  return <DonatePageClient />;
}
