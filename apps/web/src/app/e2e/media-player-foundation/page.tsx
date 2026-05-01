'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type ScenarioId =
  | 'mp-scenario-vts'
  | 'mp-scenario-chapter-toc-false'
  | 'mp-scenario-chapter-normal'
  | 'mp-scenario-none'
  | 'mp-scenario-tie-break';

type Chapter = {
  title: string;
  start: number;
  end: number;
  tableOfContents: boolean;
};

const scenarios: Record<
  ScenarioId,
  {
    id: ScenarioId;
    itemTitle: string;
    channelTitle: string;
    chapters: Chapter[];
    hasVts: boolean;
    vtsItemPath?: string;
  }
> = {
  'mp-scenario-vts': {
    id: 'mp-scenario-vts',
    itemTitle: 'Base episode title',
    channelTitle: 'Base channel',
    chapters: [],
    hasVts: true,
    vtsItemPath: '/episode/mp-scenario-vts-remote',
  },
  'mp-scenario-chapter-toc-false': {
    id: 'mp-scenario-chapter-toc-false',
    itemTitle: 'Base chapter episode',
    channelTitle: 'Chapter channel',
    hasVts: false,
    chapters: [
      { title: 'Wrapper chapter', start: 0, end: 40, tableOfContents: true },
      { title: 'Inner toc:false chapter', start: 5, end: 20, tableOfContents: false },
    ],
  },
  'mp-scenario-chapter-normal': {
    id: 'mp-scenario-chapter-normal',
    itemTitle: 'Normal chapter episode',
    channelTitle: 'Chapter channel',
    hasVts: false,
    chapters: [{ title: 'Standard chapter', start: 1, end: 50, tableOfContents: true }],
  },
  'mp-scenario-none': {
    id: 'mp-scenario-none',
    itemTitle: 'No chapter episode',
    channelTitle: 'No chapter channel',
    hasVts: false,
    chapters: [],
  },
  'mp-scenario-tie-break': {
    id: 'mp-scenario-tie-break',
    itemTitle: 'Tie break episode',
    channelTitle: 'Tie break channel',
    hasVts: false,
    chapters: [
      { title: 'First overlapping chapter', start: 0, end: 30, tableOfContents: true },
      { title: 'Second overlapping chapter', start: 5, end: 25, tableOfContents: true },
    ],
  },
};

const getActiveChapter = (chapters: Chapter[], currentTimeSeconds: number): Chapter | null => {
  const matching = chapters.filter(
    (chapter) => currentTimeSeconds >= chapter.start && currentTimeSeconds < chapter.end
  );
  if (matching.length === 0) {
    return null;
  }

  return matching.find((chapter) => chapter.tableOfContents === false) ?? matching[0] ?? null;
};

const getOverlayResolution = (
  scenario: (typeof scenarios)[ScenarioId],
  currentTimeSeconds: number
) => {
  if (scenario.hasVts) {
    return {
      tier: 'vts' as const,
      title: 'VTS Remote Match',
      infoPath: scenario.vtsItemPath ?? '/episode/mp-scenario-vts-remote',
      showLike: true,
    };
  }

  const activeChapter = getActiveChapter(scenario.chapters, currentTimeSeconds);
  if (activeChapter) {
    return {
      tier: activeChapter.tableOfContents ? ('chapter' as const) : ('tocFalse' as const),
      title: activeChapter.title,
      infoPath: `/chapter/${encodeURIComponent(activeChapter.title.toLowerCase().replace(/\s+/g, '-'))}`,
      showLike: false,
    };
  }

  return {
    tier: 'none' as const,
    title: scenario.itemTitle,
    infoPath: '/episode/mp-scenario-none',
    showLike: false,
  };
};

export default function MediaPlayerFoundationPage() {
  const [currentTimeSeconds, setCurrentTimeSeconds] = useState(0);
  const [scenarioId, setScenarioId] = useState<ScenarioId>('mp-scenario-vts');
  const [loggedIn, setLoggedIn] = useState(false);
  const [liked, setLiked] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    const onSeek = (event: Event) => {
      const customEvent = event as CustomEvent<{ time?: number }>;
      const time = customEvent.detail?.time;
      if (typeof time === 'number' && Number.isFinite(time)) {
        setCurrentTimeSeconds(time);
      }
    };

    const onScenario = (event: Event) => {
      const customEvent = event as CustomEvent<{ scenarioId?: string }>;
      const nextScenarioId = customEvent.detail?.scenarioId;
      if (typeof nextScenarioId === 'string' && nextScenarioId in scenarios) {
        setScenarioId(nextScenarioId as ScenarioId);
        setLiked(false);
      }
    };

    window.addEventListener('media_player_seek', onSeek as EventListener);
    window.addEventListener('media_player_set_scenario', onScenario as EventListener);
    return () => {
      window.removeEventListener('media_player_seek', onSeek as EventListener);
      window.removeEventListener('media_player_set_scenario', onScenario as EventListener);
    };
  }, []);

  const scenario = scenarios[scenarioId];
  const overlay = useMemo(
    () => getOverlayResolution(scenario, currentTimeSeconds),
    [scenario, currentTimeSeconds]
  );

  const onLikeClick = () => {
    if (!loggedIn) {
      setShowLoginModal(true);
      return;
    }

    setShowLoginModal(false);
    setLiked((prev) => !prev);
  };

  return (
    <main style={{ padding: '24px', display: 'grid', gap: '16px' }}>
      <h1>Media player foundation harness</h1>
      <audio
        controls
        preload="none"
        src="http://localhost:2111/audio/audio-001.mp3"
        data-testid="foundation-audio"
      />

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {(Object.keys(scenarios) as ScenarioId[]).map((id) => (
          <button
            type="button"
            key={id}
            data-testid={`scenario-${id}`}
            onClick={() => {
              setScenarioId(id);
              setLiked(false);
            }}
          >
            {id}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          type="button"
          data-testid="login-toggle"
          onClick={() => {
            setLoggedIn((prev) => !prev);
            setShowLoginModal(false);
          }}
        >
          {loggedIn ? 'Log out' : 'Log in'}
        </button>
        <span data-testid="auth-status">{loggedIn ? 'logged-in' : 'logged-out'}</span>
      </div>

      <div data-testid="mini-player-info" style={{ border: '1px solid #ccc', padding: '8px' }}>
        <div data-testid="mini-overlay-tier">{overlay.tier}</div>
        <div data-testid="mini-overlay-title">{overlay.title}</div>
        <div data-testid="mini-channel-title">{scenario.channelTitle}</div>
      </div>

      <div data-testid="full-player-info" style={{ border: '1px solid #ccc', padding: '8px' }}>
        <div data-testid="full-overlay-tier">{overlay.tier}</div>
        <div data-testid="full-overlay-title">{overlay.title}</div>
        <Link href={overlay.infoPath} data-testid="full-overlay-link">
          Open info
        </Link>
        {overlay.showLike && (
          <button type="button" data-testid="vts-like-heart" onClick={onLikeClick}>
            {liked ? 'liked' : 'not-liked'}
          </button>
        )}
      </div>

      <div data-testid="current-time">{currentTimeSeconds}</div>

      {showLoginModal && (
        <div data-testid="login-required-modal" role="dialog" aria-label="Login required">
          login_to_like
        </div>
      )}
    </main>
  );
}
