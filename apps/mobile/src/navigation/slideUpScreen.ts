import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

/**
 * Duration for every root slide-up / slide-down (full player, V4V, and the mini↔full video
 * surface reparent). One number so those motions cannot drift apart. Faster than the native-stack
 * default (~350ms) so the cover feels immediate without snapping.
 */
export const ROOT_SLIDE_UP_ANIMATION_MS = 250;

/**
 * Slide-up root screens. A card that enters from the bottom covers the window flush like a tab
 * screen. `presentation: 'modal'` is the iOS page sheet and leaves the previous screen peeking
 * above a detached card — do not use it here. Vertical gesture stays on the top edge; a
 * full-screen swipe would fight the player's scroll.
 */
export const ROOT_SLIDE_UP_SCREEN_OPTIONS: NativeStackNavigationOptions = {
  animation: 'slide_from_bottom',
  animationDuration: ROOT_SLIDE_UP_ANIMATION_MS,
  fullScreenGestureEnabled: false,
  gestureDirection: 'vertical',
  gestureEnabled: true,
  presentation: 'card',
};
