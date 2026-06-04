export type SeoRouteClass =
  | 'rss_public_content'
  | 'product_listing'
  | 'conditional_public'
  | 'noindex';

export type SeoRoutePolicy = {
  class: SeoRouteClass;
  pathPattern: string;
};

export const SEO_ROUTE_POLICIES: SeoRoutePolicy[] = [
  // A — RSS public content
  { class: 'rss_public_content', pathPattern: '/podcast/[channel_id]' },
  { class: 'rss_public_content', pathPattern: '/episode/[item_id]' },
  { class: 'rss_public_content', pathPattern: '/artist/[channel_id]' },
  { class: 'rss_public_content', pathPattern: '/album/[channel_id]' },
  { class: 'rss_public_content', pathPattern: '/track/[item_id]' },
  { class: 'rss_public_content', pathPattern: '/podcast/livestream/[item_id]' },
  { class: 'rss_public_content', pathPattern: '/music/livestream/[item_id]' },
  { class: 'rss_public_content', pathPattern: '/podcast-index/feed/[podcast_index_id]' },
  { class: 'rss_public_content', pathPattern: '/clip/[clip_id]' },
  { class: 'rss_public_content', pathPattern: '/chapter/[item_chapter_id_text]' },
  { class: 'rss_public_content', pathPattern: '/official-clip/[item_soundbite_id]' },

  // B — Product/listing/marketing
  { class: 'product_listing', pathPattern: '/' },
  { class: 'product_listing', pathPattern: '/podcasts' },
  { class: 'product_listing', pathPattern: '/episodes' },
  { class: 'product_listing', pathPattern: '/artists' },
  { class: 'product_listing', pathPattern: '/albums' },
  { class: 'product_listing', pathPattern: '/tracks' },
  { class: 'product_listing', pathPattern: '/podcasts/livestreams' },
  { class: 'product_listing', pathPattern: '/music/livestreams' },
  { class: 'product_listing', pathPattern: '/playlists' },
  { class: 'product_listing', pathPattern: '/clips' },
  { class: 'product_listing', pathPattern: '/videos' },
  { class: 'product_listing', pathPattern: '/profiles' },
  { class: 'product_listing', pathPattern: '/about' },
  { class: 'product_listing', pathPattern: '/contact' },
  { class: 'product_listing', pathPattern: '/terms' },
  { class: 'product_listing', pathPattern: '/donate' },
  { class: 'product_listing', pathPattern: '/mobile-app' },
  { class: 'product_listing', pathPattern: '/v4v/metaboost' },

  // C — Conditional public content
  { class: 'conditional_public', pathPattern: '/profile/[id_text]' },
  { class: 'conditional_public', pathPattern: '/playlist/[playlist_id]' },

  // D — Noindex route groups
  { class: 'noindex', pathPattern: '/settings' },
  { class: 'noindex', pathPattern: '/my-profile' },
  { class: 'noindex', pathPattern: '/my-clips' },
  { class: 'noindex', pathPattern: '/history' },
  { class: 'noindex', pathPattern: '/queues' },
  { class: 'noindex', pathPattern: '/sign-up' },
  { class: 'noindex', pathPattern: '/reset-password' },
  { class: 'noindex', pathPattern: '/verify-email' },
  { class: 'noindex', pathPattern: '/set-password' },
  { class: 'noindex', pathPattern: '/forgot-password' },
  { class: 'noindex', pathPattern: '/email-change' },
  { class: 'noindex', pathPattern: '/email-change-verifying' },
  { class: 'noindex', pathPattern: '/checkout' },
  { class: 'noindex', pathPattern: '/membership' },
  { class: 'noindex', pathPattern: '/membership/renew' },
  { class: 'noindex', pathPattern: '/search' },
  { class: 'noindex', pathPattern: '/embed' },
  { class: 'noindex', pathPattern: '/add-by-rss/**' },
  { class: 'noindex', pathPattern: '/playlist/create' },
  { class: 'noindex', pathPattern: '/playlist/edit/[playlist_id]' },
  { class: 'noindex', pathPattern: '/clip/edit/[clip_id]' },
  { class: 'noindex', pathPattern: '/e2e/**' },
  { class: 'noindex', pathPattern: '/test-error-boundaries' },
  { class: 'noindex', pathPattern: '/management-web/**' },

  // E — Special cases
  { class: 'noindex', pathPattern: '/takedown-notice/[podcast_index_id]' },
];
