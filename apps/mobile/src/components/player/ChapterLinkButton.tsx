import { Ionicons } from '@expo/vector-icons';

import { LIST_ROW_ACTION_ICON_SIZE } from '../../theme/screenLayout';
import { useTheme } from '../../theme/useTheme';

/**
 * Decorative chapter-link glyph. The title/time row owns the press; this mark only shows that a
 * link is available.
 */
export function ChapterLinkButton() {
  const { styles: themeStyles } = useTheme();

  return (
    <Ionicons
      color={themeStyles.textSecondary.color}
      name="link-outline"
      size={LIST_ROW_ACTION_ICON_SIZE}
    />
  );
}
