import { Feather, Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type TabBarIconProps = {
  color: string;
  focused: boolean;
  size: number;
};

type TabIconKey = 'home' | 'library' | 'more' | 'rss' | 'search';

const TAB_ICON_NAMES: Record<Exclude<TabIconKey, 'rss'>, { outline: IoniconName; filled: IoniconName }> =
  {
    home: { filled: 'home', outline: 'home-outline' },
    library: { filled: 'albums', outline: 'albums-outline' },
    more: { filled: 'ellipsis-horizontal', outline: 'ellipsis-horizontal' },
    search: { filled: 'search', outline: 'search-outline' },
  };

export function tabBarIcon(key: TabIconKey) {
  if (key === 'rss') {
    // `logo-rss` is a heavy filled mark; Feather `rss` matches Ionicons outline stroke weight.
    return function RssTabBarIcon({ color, size }: TabBarIconProps) {
      return <Feather color={color} name="rss" size={size} />;
    };
  }

  const icons = TAB_ICON_NAMES[key];

  return function TabBarIcon({ color, focused, size }: TabBarIconProps) {
    return <Ionicons color={color} name={focused ? icons.filled : icons.outline} size={size} />;
  };
}
