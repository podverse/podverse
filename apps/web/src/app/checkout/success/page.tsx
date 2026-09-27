import { buildNoindexMetadata } from '../../../lib/seo/buildNoindexMetadata';
import { CheckoutSuccessPageClient } from './CheckoutSuccessPageClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return buildNoindexMetadata();
}

export default function CheckoutSuccessPage() {
  return <CheckoutSuccessPageClient />;
}
