import type { TextInputProps } from '../TextInput/TextInput';
import { TextInput } from '../TextInput/TextInput';

export type CompactTextInputProps = Omit<TextInputProps, 'layout'>;

/** Narrow text field (~one-sixth row width) for short identifiers and tokens. Stack vertically with {@link FormStack}. */
export function CompactTextInput(props: CompactTextInputProps) {
  return <TextInput {...props} layout="compact" />;
}
