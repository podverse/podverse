import { getCuratedStaticPageMetadata } from '../../lib/seo/curatedPageMetadata';
import { ContactPageClient } from './ContactPageClient';

export async function generateMetadata() {
  return getCuratedStaticPageMetadata('contact');
}

export default function ContactPage() {
  return <ContactPageClient />;
}
