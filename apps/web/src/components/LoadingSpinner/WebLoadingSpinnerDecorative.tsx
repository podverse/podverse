import type { LoadingSpinnerProps } from '@podverse/ui';
import { LoadingSpinner } from '@podverse/ui';

export type WebLoadingSpinnerDecorativeSmallProps = Omit<
  LoadingSpinnerProps,
  'decorative' | 'size'
>;

export function WebLoadingSpinnerDecorativeSmall(props: WebLoadingSpinnerDecorativeSmallProps) {
  return <LoadingSpinner decorative size="small" {...props} />;
}

export type WebLoadingSpinnerDecorativeMediumProps = Omit<
  LoadingSpinnerProps,
  'decorative' | 'size'
>;

export function WebLoadingSpinnerDecorativeMedium(props: WebLoadingSpinnerDecorativeMediumProps) {
  return <LoadingSpinner decorative size="medium" {...props} />;
}
