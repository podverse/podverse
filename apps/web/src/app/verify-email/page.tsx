import { z } from 'zod';

import { buildNoindexMetadata } from '../../lib/seo/buildNoindexMetadata';
import { VerifyEmailPageClient } from './VerifyEmailPageClient';

const searchParamsSchema = z.object({
  token: z.string().optional(),
});

type SearchParams = z.infer<typeof searchParamsSchema>;

export type PodcastsPageProps = {
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata() {
  return buildNoindexMetadata();
}

export default async function VerifyEmailPage({ searchParams }: PodcastsPageProps) {
  const queryParams = searchParams ? await searchParams : {};
  const { token } = await parseSearchParams(queryParams);

  return <VerifyEmailPageClient token={token} />;
}

async function parseSearchParams(queryParams: SearchParams) {
  const parsed = searchParamsSchema.safeParse(queryParams);
  if (!parsed.success) {
    return {};
  }
  const data = parsed.data;

  return data;
}
