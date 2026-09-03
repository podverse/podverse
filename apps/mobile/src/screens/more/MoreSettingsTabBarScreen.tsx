import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '../../components/primitives/Card';
import type { ReorderDropEvent } from '../../components/reorder/ReorderableSections';
import { ReorderableSections } from '../../components/reorder/ReorderableSections';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { useTabLayout } from '../../navigation/TabLayoutProvider';
import type { ContentTabId } from '../../prefs/tabLayout';
import {
  addVisibleTab,
  applyTabBarDrop,
  isContentTabId,
  isTabBarSectionId,
  moveVisibleTab,
  removeVisibleTab,
  TAB_TEST_ID_SLUG,
  tabLabelKey,
} from '../../prefs/tabLayout';
import { useTheme } from '../../theme/useTheme';

const ACTION_MOVE_DOWN = 'moveDown';
const ACTION_MOVE_TO_MORE = 'moveToMore';
const ACTION_MOVE_UP = 'moveUp';
const ACTION_ADD_TO_BAR = 'addToBar';

export function MoreSettingsTabBarScreen() {
  const { t } = useTranslation();
  const { overflowTabIds, setVisibleTabs, visibleTabIds } = useTabLayout();
  const { styles: themeStyles, tokens } = useTheme();
  const [isDragging, setIsDragging] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        heading: {
          color: themeStyles.textPrimary.color,
          fontSize: 16,
          fontWeight: '700',
          marginBottom: tokens.spacing.sm,
        },
        hiddenAction: {
          height: 8,
          width: 8,
        },
        hiddenActions: {
          opacity: 0.01,
          position: 'absolute',
        },
        section: {
          marginBottom: tokens.spacing.lg,
        },
        title: {
          color: themeStyles.textPrimary.color,
          fontSize: 16,
          fontWeight: '600',
        },
      }),
    [themeStyles, tokens]
  );

  const persist = (next: readonly ContentTabId[]) => {
    void setVisibleTabs(next);
  };

  const handleDrop = (event: ReorderDropEvent) => {
    if (!isContentTabId(event.id) || !isTabBarSectionId(event.fromSection)) {
      return;
    }
    if (!isTabBarSectionId(event.toSection)) {
      return;
    }
    persist(
      applyTabBarDrop(visibleTabIds, {
        fromIndex: event.fromIndex,
        fromSection: event.fromSection,
        id: event.id,
        toIndex: event.toIndex,
        toSection: event.toSection,
      })
    );
  };

  return (
    <MobileScreenContainer scrollEnabled={!isDragging} testID="more-settings-tab-bar-screen">
      <ReorderableSections
        handleTestID={(tabId) => `more-settings-tab-bar-handle-${TAB_TEST_ID_SLUG[tabId]}`}
        keyExtractor={(tabId) => tabId}
        onDragActiveChange={setIsDragging}
        onDrop={handleDrop}
        renderItem={(tabId) => {
          const slug = TAB_TEST_ID_SLUG[tabId];
          const isVisible = visibleTabIds.includes(tabId);
          const visibleIndex = visibleTabIds.indexOf(tabId);
          return (
            <View testID={`more-settings-tab-bar-${isVisible ? 'visible' : 'overflow'}-${slug}`}>
              <Text style={styles.title}>{t(tabLabelKey(tabId))}</Text>
              <View
                accessible={false}
                importantForAccessibility="no-hide-descendants"
                style={styles.hiddenActions}
              >
                {isVisible ? (
                  <>
                    <Pressable
                      disabled={visibleIndex <= 0}
                      onPress={() => {
                        persist(moveVisibleTab(visibleTabIds, visibleIndex, -1));
                      }}
                      style={styles.hiddenAction}
                      testID={`more-settings-tab-bar-up-${slug}`}
                    />
                    <Pressable
                      disabled={visibleIndex === visibleTabIds.length - 1}
                      onPress={() => {
                        persist(moveVisibleTab(visibleTabIds, visibleIndex, 1));
                      }}
                      style={styles.hiddenAction}
                      testID={`more-settings-tab-bar-down-${slug}`}
                    />
                    <Pressable
                      disabled={visibleTabIds.length <= 1}
                      onPress={() => {
                        persist(removeVisibleTab(visibleTabIds, tabId));
                      }}
                      style={styles.hiddenAction}
                      testID={`more-settings-tab-bar-remove-${slug}`}
                    />
                  </>
                ) : (
                  <Pressable
                    onPress={() => {
                      persist(addVisibleTab(visibleTabIds, tabId));
                    }}
                    style={styles.hiddenAction}
                    testID={`more-settings-tab-bar-add-${slug}`}
                  />
                )}
              </View>
            </View>
          );
        }}
        renderSection={(sectionId, children) => (
          <View style={styles.section}>
            <Text style={styles.heading}>
              {t(
                sectionId === 'visible'
                  ? 'settings.tab_bar.visible_heading'
                  : 'settings.tab_bar.more_heading'
              )}
            </Text>
            <Card
              padded={false}
              testID={
                sectionId === 'visible'
                  ? 'more-settings-tab-bar-visible'
                  : 'more-settings-tab-bar-overflow'
              }
            >
              {children}
            </Card>
          </View>
        )}
        rowAccessibility={(tabId, context) => {
          const isVisible = context.sectionId === 'visible';
          const actions = isVisible
            ? [
                ...(context.index > 0
                  ? [{ label: t('settings.tab_bar.move_up'), name: ACTION_MOVE_UP }]
                  : []),
                ...(context.index < visibleTabIds.length - 1
                  ? [{ label: t('settings.tab_bar.move_down'), name: ACTION_MOVE_DOWN }]
                  : []),
                ...(visibleTabIds.length > 1
                  ? [{ label: t('settings.tab_bar.move_to_more'), name: ACTION_MOVE_TO_MORE }]
                  : []),
              ]
            : [{ label: t('settings.tab_bar.add_to_bar'), name: ACTION_ADD_TO_BAR }];

          return {
            actions,
            hint: t('settings.tab_bar.reorder_hint'),
            label: t(tabLabelKey(tabId)),
            onAction: (name) => {
              if (name === ACTION_MOVE_UP) {
                persist(moveVisibleTab(visibleTabIds, context.index, -1));
                return;
              }
              if (name === ACTION_MOVE_DOWN) {
                persist(moveVisibleTab(visibleTabIds, context.index, 1));
                return;
              }
              if (name === ACTION_MOVE_TO_MORE) {
                persist(removeVisibleTab(visibleTabIds, tabId));
                return;
              }
              if (name === ACTION_ADD_TO_BAR) {
                persist(addVisibleTab(visibleTabIds, tabId));
              }
            },
          };
        }}
        sections={[
          { id: 'visible', items: visibleTabIds },
          { id: 'overflow', items: overflowTabIds },
        ]}
      />
    </MobileScreenContainer>
  );
}
