import { ListError } from './ListError';

type RetryableErrorProps = {
  errorKey: string;
  onRetry: () => void;
  testID?: string;
};

export function RetryableError({ errorKey, onRetry, testID }: RetryableErrorProps) {
  return <ListError messageKey={errorKey} onRetry={onRetry} testID={testID} />;
}
