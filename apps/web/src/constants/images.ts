const SIZE_BASE = {
  SIZE: 112,
  SIZE_FIND_TARGET: 224,
};

const SIZE_SM = {
  SIZE: 84,
  SIZE_FIND_TARGET: 168,
};

const SIZE_XXS = {
  SIZE: 54,
  SIZE_FIND_TARGET: 108,
};

export const IMAGES = {
  ADD_FEED: {
    SQUARE: {
      SIZE: 300,
      SIZE_FIND_TARGET: 600,
    },
  },
  HEADER: {
    DESKTOP: {
      SQUARE: {
        SIZE: 128,
        SIZE_FIND_TARGET: 256,
      },
    },
    TABLET: {
      SQUARE: {
        SIZE: 128,
        SIZE_FIND_TARGET: 256,
      },
    },
    MOBILE: {
      SQUARE: {
        SIZE: SIZE_BASE.SIZE,
        SIZE_FIND_TARGET: SIZE_BASE.SIZE_FIND_TARGET,
      },
    },
  },
  LIST: {
    GRID: {
      SIZE: 600,
      SIZE_FIND_TARGET: 1200,
    },
    LIVESTREAMS: {
      DESKTOP: {
        SIZE: SIZE_BASE.SIZE,
        SIZE_FIND_TARGET: SIZE_BASE.SIZE_FIND_TARGET,
      },
      MOBILE: {
        SIZE: SIZE_BASE.SIZE,
        SIZE_FIND_TARGET: SIZE_BASE.SIZE_FIND_TARGET,
      },
    },
    EPISODES: {
      DESKTOP: {
        SIZE: SIZE_BASE.SIZE,
        SIZE_FIND_TARGET: SIZE_BASE.SIZE_FIND_TARGET,
      },
      MOBILE: {
        SIZE: SIZE_BASE.SIZE,
        SIZE_FIND_TARGET: SIZE_BASE.SIZE_FIND_TARGET,
      },
    },
    PODCASTS: {
      SIZE: SIZE_SM.SIZE,
      SIZE_FIND_TARGET: SIZE_SM.SIZE_FIND_TARGET,
    },
    CLIPS: {
      SIZE: SIZE_BASE.SIZE,
      SIZE_FIND_TARGET: SIZE_BASE.SIZE_FIND_TARGET,
    },
    ITEM_CHAPTERS: {
      SIZE: SIZE_BASE.SIZE,
      SIZE_FIND_TARGET: SIZE_BASE.SIZE_FIND_TARGET,
    },
    ARTISTS: {
      SIZE: SIZE_SM.SIZE,
      SIZE_FIND_TARGET: SIZE_SM.SIZE_FIND_TARGET,
    },
    ALBUMS: {
      SIZE: SIZE_SM.SIZE,
      SIZE_FIND_TARGET: SIZE_SM.SIZE_FIND_TARGET,
    },
    TRACKS: {
      DESKTOP: {
        SIZE: SIZE_XXS.SIZE,
        SIZE_FIND_TARGET: SIZE_XXS.SIZE_FIND_TARGET,
      },
      MOBILE: {
        SIZE: SIZE_XXS.SIZE,
        SIZE_FIND_TARGET: SIZE_XXS.SIZE_FIND_TARGET,
      },
    },
    SEARCH: {
      SIZE: SIZE_BASE.SIZE,
      SIZE_FIND_TARGET: SIZE_BASE.SIZE_FIND_TARGET,
    },
  },
  MEDIA_HEADER_MINI: {
    SQUARE: {
      SIZE: 64,
      SIZE_FIND_TARGET: 128,
    },
  },
  MEDIA_PLAYER: {
    DESKTOP: {
      MINI: {
        SIZE: 76,
        SIZE_FIND_TARGET: 152,
      },
    },
    MOBILE: {
      MINI: {
        SIZE: 40,
        SIZE_FIND_TARGET: 80,
      },
    },
  },
  PEOPLE: {
    SQUARE: {
      SIZE: 64,
      SIZE_FIND_TARGET: 128,
    },
  },
  PODROLL: {
    SQUARE: {
      SIZE: 64,
      SIZE_FIND_TARGET: 128,
    },
  },
  SRC: {
    PLACEHOLDER: '/images/placeholder-image.png',
    /** Guaranteed app-local artwork fallback (also used as final embed candidate). */
    EMBED_PLACEHOLDER: '/images/placeholder-image.png',
  },
  EMBED: {
    /** Test-assets PNG served on port 2111; regenerate via `npm run generate:e2e-images -w podverse-test-assets`. */
    TEST_ASSETS_PLACEHOLDER_URL: 'http://localhost:2111/e2e/images/e2e-embed-placeholder.png',
    TEST_ASSETS_CHANNEL_IMAGE_URL:
      'http://localhost:2111/e2e/images/e2e-embed-channel-art-1400.png',
    TEST_ASSETS_ITEM_IMAGE_URL: 'http://localhost:2111/e2e/images/e2e-embed-item-art-1400.png',
  },
  MOBILE: {
    APP_STORES: {
      DESKTOP: {
        WIDTH: 135,
        HEIGHT: 40,
        APP_STORE: '/images/mobile/app-stores/download-badge-download-on-the-app-store.svg',
        GOOGLE_PLAY: '/images/mobile/app-stores/download-badge-get-it-on-google-play.png',
        F_DROID: '/images/mobile/app-stores/download-badge-get-it-on-fdroid.png',
      },
      MOBILE: {
        WIDTH: 270,
        HEIGHT: 80,
        APP_STORE: '/images/mobile/app-stores/download-badge-download-on-the-app-store.svg',
        GOOGLE_PLAY: '/images/mobile/app-stores/download-badge-get-it-on-google-play.png',
        F_DROID: '/images/mobile/app-stores/download-badge-get-it-on-fdroid.png',
      },
    },
  },
};
