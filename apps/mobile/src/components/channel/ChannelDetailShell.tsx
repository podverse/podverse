import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { listHeaderStackGap, screenBodyInsets } from '../../theme/screenLayout';
import { useTheme } from '../../theme/useTheme';
import type { SectionChipItem } from '../form';
import { SectionChipRow } from '../form';
import { LoadingSection } from '../state/LoadingSection';

export type ChannelDetailShellProps<TSection extends string> = {
  channelHeader: ReactNode;
  chipTrailing?: ReactNode;
  sectionBody: ReactNode;
  sectionChips: readonly SectionChipItem<TSection>[];
  selectedSection: TSection;
  onSelectSection: (section: TSection) => void;
  isSectionHydrated: boolean;
  loadingTestID?: string;
  sectionsTestID: string;
  testID: string;
};

/**
 * Shared channel-detail scaffold: pinned identity + section chips above one active pane.
 */
export function ChannelDetailShell<TSection extends string>({
  channelHeader,
  chipTrailing,
  isSectionHydrated,
  loadingTestID,
  onSelectSection,
  sectionBody,
  sectionChips,
  sectionsTestID,
  selectedSection,
  testID,
}: ChannelDetailShellProps<TSection>) {
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        chipRow: {
          marginTop: listHeaderStackGap(tokens.spacing),
        },
        container: {
          backgroundColor: themeStyles.screen.backgroundColor,
          flex: 1,
        },
        pinnedChrome: {
          ...screenBodyInsets(tokens.spacing),
        },
        sectionBody: {
          flex: 1,
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <View style={styles.container} testID={testID}>
      {isSectionHydrated ? (
        <>
          <View style={styles.pinnedChrome}>
            {channelHeader}
            <View style={styles.chipRow}>
              <SectionChipRow
                items={sectionChips}
                onSelect={onSelectSection}
                selectedKey={selectedSection}
                testID={sectionsTestID}
                trailing={chipTrailing}
              />
            </View>
          </View>
          <View style={styles.sectionBody}>{sectionBody}</View>
        </>
      ) : (
        <>
          <View style={styles.pinnedChrome}>{channelHeader}</View>
          <LoadingSection testID={loadingTestID} />
        </>
      )}
    </View>
  );
}
