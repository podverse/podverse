import type { NativeStackHeaderProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { ROOT_SEARCH_ROUTE_NAME } from '../../navigation/slideUpScreen';
import { HomeNotificationsBell } from '../../screens/home/HomeNotificationsBell';
import { HomeSearchButton } from '../../screens/home/HomeSearchButton';
import { headerBackChoice } from './headerBackChoice';
import { HeaderBarActions } from './HeaderBarActions';
import { HeaderBarChrome } from './HeaderBarChrome';

/**
 * Custom themed native-stack header. Renders a solid, token-colored bar so the header/back button
 * start and finish the same color with no iOS native appearance recolor during push transitions.
 * Native back-swipe still works (this only replaces the header UI, not the native stack).
 */
export function ThemedStackHeader({ navigation, options }: NativeStackHeaderProps) {
  const { t } = useTranslation();
  const title = options.title ?? '';
  const parent = navigation.getParent();
  const parentState = parent?.getState();
  const state = navigation.getState();
  const choice = headerBackChoice({
    focusedRouteName: state.routes[state.index]?.name,
    // `back` is also set when a parent screen can go back, including on this
    // stack's first route. Own history is a previous route on this stack.
    hasStackBack: state.index > 0,
    initialRouteName: state.routeNames[0],
    parentStackCanGoBack:
      parent !== undefined &&
      parentState !== undefined &&
      parentState.type === 'stack' &&
      parentState.index > 0,
  });
  // The root of a stack pushed onto another stack has no history of its own. Back pops the
  // navigator that opened it (an overflow tab opened from More). A screen opened as the only
  // route returns to the stack's first registered screen.
  let onBack: (() => void) | undefined;
  if (choice === 'goBack') {
    onBack = () => {
      navigation.goBack();
    };
  } else if (choice === 'resetToInitial') {
    const initialRouteName = state.routeNames[0];
    if (initialRouteName !== undefined) {
      onBack = () => {
        navigation.reset({ index: 0, routes: [{ name: initialRouteName }] });
      };
    }
  } else if (choice === 'parentGoBack' && parent !== undefined) {
    onBack = () => {
      parent.goBack();
    };
  }

  const parentRouteName = parentState?.routes[parentState.index]?.name;
  const dismissesSearchSheet =
    choice === 'parentGoBack' && parentRouteName === ROOT_SEARCH_ROUTE_NAME;
  // Search and the inbox bell belong only on the Home tab root. Compare the route name as a
  // string so this header does not import navigation route constants (that module loads these
  // screen options).
  const isHomeRoot = choice === 'none' && state.routes[state.index]?.name === 'HomeRoot';
  const screenRight =
    options.headerRight === undefined
      ? undefined
      : options.headerRight({
          canGoBack: onBack !== undefined,
          tintColor: options.headerTintColor,
        });

  return (
    <HeaderBarChrome
      backAccessibilityLabel={dismissesSearchSheet ? t('misc.dismiss') : t('misc.go_back')}
      backIcon={dismissesSearchSheet ? 'chevron-down' : 'chevron-back'}
      backTestID={dismissesSearchSheet ? 'search-dismiss' : 'stack-header-back'}
      left={
        isHomeRoot ? (
          <HomeSearchButton />
        ) : onBack === undefined && options.headerLeft !== undefined ? (
          options.headerLeft({
            canGoBack: false,
            tintColor: options.headerTintColor,
          })
        ) : undefined
      }
      onBack={onBack}
      right={
        isHomeRoot ? (
          <HeaderBarActions>
            <HomeNotificationsBell />
            {screenRight}
          </HeaderBarActions>
        ) : (
          screenRight
        )
      }
      title={title}
    />
  );
}
