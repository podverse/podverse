import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BottomTabBar } from '@react-navigation/bottom-tabs';

import { useTabLayout } from './TabLayoutProvider';

/**
 * Renders the stored visible tab order. Declaration order of Tab.Screen stays stable so stacks do
 * not remount when the user rearranges the bar.
 */
export function OrderedTabBar(props: BottomTabBarProps) {
  const { visibleTabIds } = useTabLayout();
  const orderedNames = [...visibleTabIds, 'More'];
  const routes = orderedNames.flatMap((name) => {
    const route = props.state.routes.find((candidate) => candidate.name === name);
    return route === undefined ? [] : [route];
  });
  const focusedKey = props.state.routes[props.state.index]?.key;
  const focusedIndex = routes.findIndex((route) => route.key === focusedKey);

  return (
    <BottomTabBar
      {...props}
      state={{
        ...props.state,
        index: focusedIndex === -1 ? 0 : focusedIndex,
        routes,
      }}
    />
  );
}
