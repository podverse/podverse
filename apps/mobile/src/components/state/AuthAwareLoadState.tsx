import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAuthPrompt } from '../../auth/AuthPromptContext';
import { screenBodyInsets } from '../../theme/screenLayout';
import { useTheme } from '../../theme/useTheme';
import { CallToActionSection } from './CallToActionSection';
import { ListEmpty } from './ListEmpty';
import { LoadingSection } from './LoadingSection';
import { RetryableError } from './RetryableError';

type AuthAwareLoadStateProps = {
  children?: ReactNode;
  /**
   * Login-required body. Defaults to the generic `authentication.login_required` sentence.
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

function TopFill({ children }: { children: ReactNode }) {
  const { tokens } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          ...screenBodyInsets(tokens.spacing),
          alignSelf: 'stretch',
        },
      }),
    [tokens]
  );

  return <View style={styles.root}>{children}</View>;
}

export function AuthAwareLoadState({
  authMessageKey = 'authentication.login_required',
  children,
  emptyMessageKey,
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
      <TopFill>
        <RetryableError errorKey={errorKey} onRetry={onRetry} testID={errorTestID} />
      </TopFill>
    );
  }

  if (showAuthRequired) {
    return (
      <TopFill>
        <CallToActionSection
          actionLabelKey="authentication.login"
          messageKey={authMessageKey}
          onAction={onRequestLogin}
          testID={emptyTestID}
        />
      </TopFill>
    );
  }

  if (showEmpty && emptyMessageKey !== undefined) {
    return (
      <TopFill>
        <ListEmpty messageKey={emptyMessageKey} testID={emptyTestID} />
      </TopFill>
    );
  }

  return <>{children}</>;
}
