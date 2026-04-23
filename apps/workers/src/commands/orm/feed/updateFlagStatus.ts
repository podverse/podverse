import { FeedFlagStatusReasonEnum, FeedFlagStatusStatusEnum, FeedService } from '@podverse/orm';

export async function ormFeedUpdateFlagStatus() {
  const podcastIndexIdArg = process.argv[3];
  const feedFlagStatusIdArg = process.argv[4];
  const feedFlagStatusReasonIdArg = process.argv[5];
  const feedFlagStatusReasonNoteArg = process.argv[6];

  if (!podcastIndexIdArg || !feedFlagStatusIdArg) {
    console.error(
      'Usage: node updateFlagStatus.js <podcast_index_id> <feed_flag_status_id> [reason_id] [reason_note]'
    );
    process.exit(1);
  }

  const podcast_index_id = Number(podcastIndexIdArg.trim());
  const feed_flag_status_id = Number(feedFlagStatusIdArg.trim());

  if (isNaN(podcast_index_id) || podcast_index_id <= 0) {
    console.error('Invalid podcast_index_id');
    process.exit(1);
  }

  if (!Object.values(FeedFlagStatusStatusEnum).includes(feed_flag_status_id)) {
    console.error(
      'Invalid feed_flag_status_id. Must be one of:',
      Object.values(FeedFlagStatusStatusEnum).join(', ')
    );
    process.exit(1);
  }

  let reason_id: FeedFlagStatusReasonEnum | undefined;
  if (feedFlagStatusReasonIdArg) {
    reason_id = Number(feedFlagStatusReasonIdArg.trim());
    if (!Object.values(FeedFlagStatusReasonEnum).includes(reason_id)) {
      console.error(
        'Invalid reason_id. Must be one of:',
        Object.values(FeedFlagStatusReasonEnum).join(', ')
      );
      process.exit(1);
    }
  }

  const feedService = new FeedService();
  const feed = await feedService.getByPodcastIndexId(podcast_index_id);

  if (!feed) {
    console.error(`Feed not found for podcast_index_id: ${podcast_index_id}`);
    process.exit(1);
  }

  await feedService.updateFlagStatus(feed, feed_flag_status_id as FeedFlagStatusStatusEnum, {
    feed_flag_status_reason_id: reason_id,
    feed_flag_status_reason_note: feedFlagStatusReasonNoteArg?.trim() || undefined,
  });
  console.warn(
    `Feed flag status updated for podcast_index_id ${podcast_index_id} to ${feed_flag_status_id}` +
      (reason_id ? ` with reason ${reason_id}` : '')
  );
}
