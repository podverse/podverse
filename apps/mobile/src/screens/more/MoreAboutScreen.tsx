import { CopyMarkdown } from '../../components/content/CopyMarkdown';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { LoadingSection } from '../../components/state/LoadingSection';
import { RetryableError } from '../../components/state/RetryableError';
import { useManagedCopy } from '../../hooks/useManagedCopy';

export function MoreAboutScreen() {
  const { errorKey, isLoading, markdown, retry } = useManagedCopy({ slug: 'about' });

  return (
    <MobileScreenContainer scrollEnabled={!isLoading} testID="more-about-screen">
      {isLoading ? <LoadingSection testID="more-about-loading" /> : null}
      {!isLoading && (errorKey !== null || markdown === null) ? (
        <RetryableError
          errorKey={errorKey ?? 'errors.generic'}
          onRetry={retry}
          testID="more-about-error"
        />
      ) : null}
      {!isLoading && errorKey === null && markdown !== null ? (
        <CopyMarkdown markdown={markdown} surface="mobile" />
      ) : null}
    </MobileScreenContainer>
  );
}
