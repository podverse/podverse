export const EMBED_BUILDER_TYPES = ['audio', 'video', 'audio-list', 'video-list'] as const;

export type EmbedBuilderType = (typeof EMBED_BUILDER_TYPES)[number];

export type EmbedBuilderQueryParams = {
  type: EmbedBuilderType;
  channel: string | null;
  mediumId: number | null;
  item: string | null;
  clip: string | null;
  itemChapter: string | null;
  itemSoundbite: string | null;
  playlist: string | null;
  playlistItem: string | null;
  sort: string | null;
  autoplay: boolean;
  startSeconds: number;
  playIdText: string | null;
  showChapterMarkers: boolean;
};

export type EmbedBuilderPresentation = {
  layout: 'single' | 'list';
  presentation: 'audio' | 'video';
};
