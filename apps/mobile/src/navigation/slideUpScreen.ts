import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { Platform } from 'react-native';

import { HEADER_BAR_HEIGHT } from '../components/screen/HeaderBar';

/**
 * Duration for every root slide-up / slide-down (full player, image viewer, V4V, Search,
 * notifications, and the mini↔full video surface reparent). One number so those motions cannot
 * drift apart. Faster than the native-stack default (~350ms) so the cover feels immediate
 * without snapping.
 */
export const ROOT_SLIDE_UP_ANIMATION_MS = 250;

/** Root route name for the Search card. Shared so the Search root header can dismiss that card. */
export const ROOT_SEARCH_ROUTE_NAME = 'Search';

/**
 * Slide-up root screens. A card that enters from the bottom covers the window flush like a tab
 * screen. `presentation: 'modal'` is the iOS page sheet and leaves the previous screen peeking
 * above a detached card — do not use it here.
 *
 * V4V and Make Clip use this base. Screens with a down-caret dismiss (full player, Search,
 * image viewer, notifications) use {@link buildRootSlideUpDismissOptions} instead.
 */
export const ROOT_SLIDE_UP_SCREEN_OPTIONS: NativeStackNavigationOptions = {
  animation: 'slide_from_bottom',
  animationDuration: ROOT_SLIDE_UP_ANIMATION_MS,
  fullScreenGestureEnabled: false,
  gestureDirection: 'vertical',
  gestureEnabled: true,
  presentation: 'card',
};

/**
 * Height of the band where a downward dismiss drag may begin: status inset plus the 44pt title
 * row. Shared by the iOS `gestureResponseDistance` and the Android / auth pan helper.
 */
export function slideUpDismissHeaderBandHeight(statusBarInset: number): number {
  return statusBarInset + HEADER_BAR_HEIGHT;
}

/**
 * Down-caret slide-up screens. iOS needs `fullScreenGestureEnabled` for a vertical pop; the
 * response distance keeps recognition in the header band so the player's list and scrubber stay
 * free. Android ignores these native options — those screens use {@link SlideUpDismissGesture}.
 */
export function buildRootSlideUpDismissOptions(
  statusBarInset: number
): NativeStackNavigationOptions {
  return {
    ...ROOT_SLIDE_UP_SCREEN_OPTIONS,
    animationMatchesGesture: true,
    fullScreenGestureEnabled: true,
    gestureResponseDistance: {
      bottom: slideUpDismissHeaderBandHeight(statusBarInset),
    },
  };
}

/**
 * Make clip uses the same slide-up card as the full player. The iOS dismiss gesture is off;
 * header back closes this screen.
 */
export const MAKE_CLIP_SCREEN_OPTIONS: NativeStackNavigationOptions = {
  ...ROOT_SLIDE_UP_SCREEN_OPTIONS,
  gestureEnabled: Platform.OS !== 'ios',
};
