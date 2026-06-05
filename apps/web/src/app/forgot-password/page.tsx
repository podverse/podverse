import { buildNoindexMetadata } from '../../lib/seo/buildNoindexMetadata';
import { ForgotPasswordPageClient } from './ForgotPasswordPageClient';

export async function generateMetadata() {
  return buildNoindexMetadata();
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordPageClient />;
}
