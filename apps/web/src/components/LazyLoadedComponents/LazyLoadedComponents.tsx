'use client';

import dynamic from 'next/dynamic';

import { ErrorBoundaryWrapper } from '../ErrorBoundary/ErrorBoundaryWrapper';

const LazyMediaPlayer = dynamic(
  () => import('../MediaPlayer/MediaPlayer').then((mod) => ({ default: mod.MediaPlayer })),
  {
    ssr: false,
    loading: () => <div aria-label="Loading media player" style={{ display: 'none' }} />,
  }
);

const LazyModals = dynamic(
  () => import('../Modals/Modals').then((mod) => ({ default: mod.Modals })),
  {
    ssr: false,
  }
);

const LazyToast = dynamic(() => import('../Toast/Toast').then((m) => ({ default: m.Toast })), {
  ssr: false,
});

const LazyMembershipExpirationToast = dynamic(
  () =>
    import('../Toast/MembershipExpirationToast').then((m) => ({
      default: m.MembershipExpirationToast,
    })),
  { ssr: false }
);

export function LazyLoadedComponents() {
  return (
    <>
      <ErrorBoundaryWrapper>
        <LazyMediaPlayer />
      </ErrorBoundaryWrapper>
      <ErrorBoundaryWrapper>
        <LazyModals />
      </ErrorBoundaryWrapper>
      <LazyToast />
      <LazyMembershipExpirationToast />
    </>
  );
}
