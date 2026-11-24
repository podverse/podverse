import { useTranslation } from 'react-i18next';

import { useTheme } from '../../theme/useTheme';
import { HeaderBarAction } from '../screen/HeaderBarAction';

type BoostHeaderActionProps = {
  onPress: () => void;
  testID: string;
};

/** Gold boost control for a stack title bar or the full player action row. */
export function BoostHeaderAction({ onPress, testID }: BoostHeaderActionProps) {
  const { t } = useTranslation();
  const { tokens } = useTheme();

  return (
    <HeaderBarAction
      accessibilityLabel={t('value.boost')}
      icon="cash-outline"
      iconColor={tokens.text.warning}
      onPress={onPress}
      testID={testID}
    />
  );
}
