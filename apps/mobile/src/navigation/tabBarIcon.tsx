import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type TabBarIconProps = {
  color: string;
  focused: boolean;
  size: number;
};

type TabIconKey = 'browse' | 'home' | 'library' | 'more' | 'notifications' | 'search';

const TAB_ICON_NAMES: Record<TabIconKey, { outline: IoniconName; filled: IoniconName }> = {
  browse: { filled: 'compass', outline: 'compass-outline' },
  home: { filled: 'home', outline: 'home-outline' },
  library: { filled: 'albums', outline: 'albums-outline' },
  more: { filled: 'ellipsis-horizontal', outline: 'ellipsis-horizontal' },
  notifications: { filled: 'notifications', outline: 'notifications-outline' },
  search: { filled: 'search', outline: 'search-outline' },
};

export function tabBarIcon(key: TabIconKey) {
  const icons = TAB_ICON_NAMES[key];

  return function TabBarIcon({ color, focused, size }: TabBarIconProps) {
    return <Ionicons color={color} name={focused ? icons.filled : icons.outline} size={size} />;
  };
}
