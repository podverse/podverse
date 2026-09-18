import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { LoadingSection } from '../../components/state/LoadingSection';
import { RetryableError } from '../../components/state/RetryableError';
import { CopyMarkdown } from '../../components/content/CopyMarkdown';
import { useManagedCopy } from '../../hooks/useManagedCopy';

export function MoreFaqScreen() {
  const { errorKey, isLoading, markdown, retry } = useManagedCopy({ slug: 'faq' });

  return (
    <MobileScreenContainer scrollEnabled={!isLoading} testID="more-faq-screen">
      {isLoading ? <LoadingSection testID="more-faq-loading" /> : null}
      {!isLoading && (errorKey !== null || markdown === null) ? (
        <RetryableError errorKey={errorKey ?? 'errors.generic'} onRetry={retry} testID="more-faq-error" />
      ) : null}
      {!isLoading && errorKey === null && markdown !== null ? <CopyMarkdown markdown={markdown} /> : null}
    </MobileScreenContainer>
  );
}
