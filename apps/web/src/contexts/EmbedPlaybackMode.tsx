'use client';

import { createContext, useContext } from 'react';

import type { EmbedPlaybackGuardrails } from '../lib/embed/embedTypes';
import { EMBED_PLAYBACK_GUARDRAILS } from '../lib/embed/embedTypes';

type EmbedPlaybackModeContextValue = EmbedPlaybackGuardrails | null;

const EmbedPlaybackModeContext = createContext<EmbedPlaybackModeContextValue>(null);

export function EmbedPlaybackModeProvider({ children }: { children: React.ReactNode }) {
  return (
    <EmbedPlaybackModeContext.Provider value={EMBED_PLAYBACK_GUARDRAILS}>
      {children}
    </EmbedPlaybackModeContext.Provider>
  );
}

export function useEmbedPlaybackMode(): EmbedPlaybackGuardrails | null {
  return useContext(EmbedPlaybackModeContext);
}

export function useEmbedPlaybackGuardrails(): EmbedPlaybackGuardrails {
  const mode = useEmbedPlaybackMode();

  if (mode === null) {
    return {
      isEmbedRoute: false,
      skipAnonymousPlaybackRestore: false,
      skipAutoQueueMutations: false,
      skipMainAppLayoutMutations: false,
    };
  }

  return mode;
}
