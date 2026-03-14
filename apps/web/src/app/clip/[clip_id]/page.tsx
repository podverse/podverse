import { notFound } from 'next/navigation';

import { getSSRAuthService } from '../../../utils/auth/ssrAuth';
import { ClipPageClient } from './ClipPageClient';

export type ClipPageProps = {
  params: Promise<{ clip_id: string }>;
};

export default async function ClipPage({ params }: ClipPageProps) {
  const { clip_id } = await params;
  const { ssrApiRequestService } = await getSSRAuthService();
  const ssrClip = await ssrApiRequestService.reqClipGet(clip_id);

  if (!ssrClip) {
    return notFound();
  }

  const ssrItem = await ssrApiRequestService.reqItemGetByIdOrIdText(ssrClip.item.id_text);

  if (!ssrItem) {
    return notFound();
  }

  const ssrChannel = await ssrApiRequestService.reqChannelGetByIdOrIdText(ssrItem.channel_id);

  if (!ssrChannel) {
    return notFound();
  }

  return <ClipPageClient ssrChannel={ssrChannel} ssrItem={ssrItem} ssrClip={ssrClip} />;
}
