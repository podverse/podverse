import type { TextInputProps } from '../TextInput/TextInput';
import { TextInput } from '../TextInput/TextInput';

export type CompactNumericInputProps = Omit<TextInputProps, 'layout' | 'type'>;

/** Narrow numeric field (~one-sixth row width) for small values such as counts and durations. Stack vertically with {@link FormStack}. */
export function CompactNumericInput(props: CompactNumericInputProps) {
  return <TextInput {...props} layout="compact" type="number" />;
}
