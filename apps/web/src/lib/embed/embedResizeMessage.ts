export const EMBED_RESIZE_MESSAGE_SOURCE = 'podverse-embed';
export const EMBED_RESIZE_MESSAGE_TYPE = 'resize';

export type EmbedResizeMessage = {
  source: typeof EMBED_RESIZE_MESSAGE_SOURCE;
  type: typeof EMBED_RESIZE_MESSAGE_TYPE;
  height: number;
};

export function isEmbedResizeMessage(data: unknown): data is EmbedResizeMessage {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const candidate = data as Partial<EmbedResizeMessage>;

  return (
    candidate.source === EMBED_RESIZE_MESSAGE_SOURCE &&
    candidate.type === EMBED_RESIZE_MESSAGE_TYPE &&
    typeof candidate.height === 'number' &&
    Number.isFinite(candidate.height) &&
    candidate.height >= 1
  );
}
