import type { ReactNode } from 'react';

import { useAuthPrompt } from '../../auth/AuthPromptContext';
import { VerticalCenter } from '../primitives';
import { CallToActionSection } from './CallToActionSection';
import { ListEmpty } from './ListEmpty';
import { LoadingSection } from './LoadingSection';
import { RetryableError } from './RetryableError';

type AuthAwareLoadStateProps = {
  children?: ReactNode;
  /**
   * Feature-specific benefit copy for the login CTA. Required when `showAuthRequired` is true —
   * do not pass `authentication.login_required`.
   */
  authMessageKey?: string;
  emptyMessageKey?: string;
  emptyTestID?: string;
  errorKey: string | null;
  errorTestID?: string;
  isLoading: boolean;
  loadingTestID?: string;
  onRetry: () => void;
  showAuthRequired?: boolean;
  showEmpty?: boolean;
};

export function AuthAwareLoadState({
  authMessageKey,
  children,
  emptyMessageKey = 'misc.info',
  emptyTestID,
  errorKey,
  errorTestID,
  isLoading,
  loadingTestID,
  onRetry,
  showAuthRequired = false,
  showEmpty = false,
}: AuthAwareLoadStateProps) {
  const { onRequestLogin } = useAuthPrompt();

  if (isLoading) {
    return <LoadingSection testID={loadingTestID} />;
  }

  if (errorKey !== null) {
    return (
      <VerticalCenter>
        <RetryableError errorKey={errorKey} onRetry={onRetry} testID={errorTestID} />
      </VerticalCenter>
    );
  }

  if (showAuthRequired) {
    if (authMessageKey === undefined) {
      throw new Error('AuthAwareLoadState requires authMessageKey when showAuthRequired is true');
    }

    return (
      <CallToActionSection
        actionLabelKey="authentication.login"
        messageKey={authMessageKey}
        onAction={onRequestLogin}
        testID={emptyTestID}
      />
    );
  }

  if (showEmpty) {
    return (
      <VerticalCenter>
        <ListEmpty messageKey={emptyMessageKey} testID={emptyTestID} />
      </VerticalCenter>
    );
  }

  return <>{children}</>;
}
