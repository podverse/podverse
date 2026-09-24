import { Platform, Switch } from 'react-native';
import type { SwitchProps } from 'react-native';

/**
 * RN sizes every iOS Switch as a fixed 51×31 layout box, but iOS 26 draws a wider control (~63×28).
 * Without a matching layout box the drawn pill spills past the row's right padding.
 */
const IOS_26_SWITCH_LAYOUT = { height: 28, width: 63 } as const;

const usesIos26SwitchLayout =
  Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 26;

export type ToggleSwitchProps = SwitchProps;

/**
 * Settings and preference switch. Prefer this over a raw React Native `Switch` so iOS 26 layout
 * matches the drawn control and row padding stays even on both sides.
 */
export function ToggleSwitch(props: ToggleSwitchProps) {
  if (!usesIos26SwitchLayout) {
    return <Switch {...props} />;
  }

  return <Switch {...props} style={[IOS_26_SWITCH_LAYOUT, props.style]} />;
}
