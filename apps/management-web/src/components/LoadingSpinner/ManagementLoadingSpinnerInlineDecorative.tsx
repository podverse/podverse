import type { LoadingSpinnerProps } from '@podverse/ui';
import { LoadingSpinner } from '@podverse/ui';

export type ManagementLoadingSpinnerInlineDecorativeProps = Omit<
  LoadingSpinnerProps,
  'decorative' | 'size'
>;

export function ManagementLoadingSpinnerInlineDecorative(
  props: ManagementLoadingSpinnerInlineDecorativeProps
) {
  return <LoadingSpinner decorative size="inline" {...props} />;
}
