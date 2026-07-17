import type { ReactNode } from 'react';

import { ListEmpty } from './ListEmpty';
import { ListLoading } from './ListLoading';
import { RetryableError } from './RetryableError';

type AuthAwareLoadStateProps = {
  children?: ReactNode;
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
  if (isLoading) {
    return <ListLoading testID={loadingTestID} />;
  }

  if (errorKey !== null) {
    return <RetryableError errorKey={errorKey} onRetry={onRetry} testID={errorTestID} />;
  }

  if (showAuthRequired) {
    return <ListEmpty messageKey="authentication.login_required" testID={emptyTestID} />;
  }

  if (showEmpty) {
    return <ListEmpty messageKey={emptyMessageKey} testID={emptyTestID} />;
  }

  return <>{children}</>;
}
