import { z } from 'zod';

import { EmailChangeVerifyingPageClient } from './EmailChangeVerifyingPageClient';

const searchParamsSchema = z.object({
  token: z.string().optional(),
});

type SearchParams = z.infer<typeof searchParamsSchema>;

export type EmailChangeVerifyingProps = {
  searchParams: Promise<SearchParams>;
};

export default async function EmailChangeVerifyingPage({
  searchParams,
}: EmailChangeVerifyingProps) {
  const queryParams = searchParams ? await searchParams : {};
  const { token } = await parseSearchParams(queryParams);

  return <EmailChangeVerifyingPageClient token={token} />;
}

async function parseSearchParams(queryParams: SearchParams) {
  const parsed = searchParamsSchema.safeParse(queryParams);
  if (!parsed.success) {
    return {};
  }
  const data = parsed.data;

  return data;
}
