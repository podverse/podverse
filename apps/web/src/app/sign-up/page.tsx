import { buildNoindexMetadata } from '../../lib/seo/buildNoindexMetadata';
import { SignUpClient } from './SignUpClient';

export async function generateMetadata() {
  return buildNoindexMetadata();
}

export default function SignUpPage() {
  return <SignUpClient />;
}
