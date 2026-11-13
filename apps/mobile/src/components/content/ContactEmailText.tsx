import type { StyleProp, TextStyle } from 'react-native';
import { Linking, Text } from 'react-native';

type ContactEmailTextProps = {
  email: string;
  linkStyle: StyleProp<TextStyle>;
  linkTestID?: string;
  style: StyleProp<TextStyle>;
  /** Already-localized text that contains `email` once. */
  text: string;
  testID?: string;
};

export function ContactEmailText({
  email,
  linkStyle,
  linkTestID,
  style,
  text,
  testID,
}: ContactEmailTextProps) {
  const emailIndex = email !== '' ? text.indexOf(email) : -1;

  if (emailIndex < 0) {
    return (
      <Text style={style} testID={testID}>
        {text}
      </Text>
    );
  }

  return (
    <Text style={style} testID={testID}>
      {text.slice(0, emailIndex)}
      <Text
        accessibilityRole="link"
        onPress={() => {
          void Linking.openURL(`mailto:${email}`);
        }}
        style={linkStyle}
        testID={linkTestID}
      >
        {email}
      </Text>
      {text.slice(emailIndex + email.length)}
    </Text>
  );
}
