import { buildNoindexMetadata } from '../../../lib/seo/buildNoindexMetadata';
import { getSSRAuthService } from '../../../utils/auth/ssrAuth';
import { TakedownNoticeClient } from './TakedownNoticeClient';

type TakedownNoticePageProps = {
  params: Promise<{ podcast_index_id: string }>;
};

export async function generateMetadata() {
  return buildNoindexMetadata();
}

export default async function TakedownNoticePage({ params }: TakedownNoticePageProps) {
  const { podcast_index_id } = await params;
  const { ssrApiRequestService } = await getSSRAuthService();
  const ssrFeed = await ssrApiRequestService.reqFeedGetByPodcastIndexId(podcast_index_id);
  return <TakedownNoticeClient ssrFeed={ssrFeed} />;
}
