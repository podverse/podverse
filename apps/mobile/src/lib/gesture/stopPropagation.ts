import type { GestureResponderEvent } from 'react-native';

export const stopPropagation = (event: GestureResponderEvent): void => {
  event.stopPropagation();
};
