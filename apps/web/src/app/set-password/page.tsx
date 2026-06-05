import { z } from 'zod';

import { buildNoindexMetadata } from '../../lib/seo/buildNoindexMetadata';
import { SetPasswordPageClient } from './SetPasswordPageClient';

const searchParamsSchema = z.object({
  token: z.string().optional(),
});

type SearchParams = z.infer<typeof searchParamsSchema>;

export type SetPasswordPageProps = {
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata() {
  return buildNoindexMetadata();
}

export default async function SetPasswordPage({ searchParams }: SetPasswordPageProps) {
  const queryParams = searchParams ? await searchParams : {};
  const parsed = searchParamsSchema.safeParse(queryParams);
  const token = parsed.success ? parsed.data.token : undefined;

  return <SetPasswordPageClient token={token} />;
}
