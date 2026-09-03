import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AccessibilityActionEvent } from 'react-native';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { HoverTarget, SectionBounds, SlotLayout } from '../../lib/reorder/resolveHover';
import {
  computeItemShift,
  flattenReorderSections,
  resolveHover,
} from '../../lib/reorder/resolveHover';
import { useTheme } from '../../theme/useTheme';
import { ReorderHandle } from '../primitives/ReorderHandle';

export type ReorderDropEvent = {
  fromIndex: number;
  fromSection: string;
  id: string;
  toIndex: number;
  toSection: string;
};

export type ReorderableSection<T> = {
  id: string;
  items: readonly T[];
};

export type ReorderableItemContext = {
  index: number;
  isLast: boolean;
  sectionId: string;
};

export type ReorderRowAccessibility = {
  actions: readonly { label: string; name: string }[];
  hint?: string;
  label: string;
  onAction: (name: string) => void;
};

export type ReorderableSectionsProps<T> = {
  handleTestID?: (item: T, context: ReorderableItemContext) => string;
  keyExtractor: (item: T) => string;
  onDragActiveChange?: (isActive: boolean) => void;
  onDrop: (event: ReorderDropEvent) => void;
  renderItem: (item: T, context: ReorderableItemContext) => ReactNode;
  renderSection: (sectionId: string, children: ReactNode) => ReactNode;
  rowAccessibility?: (item: T, context: ReorderableItemContext) => ReorderRowAccessibility;
  sections: readonly ReorderableSection<T>[];
};

type StartDrag = {
  fromIndex: number;
  fromSection: string;
  height: number;
  key: string;
};

type ReorderableRowProps<T> = {
  activeKey: SharedValue<string>;
  context: ReorderableItemContext;
  handleTestID?: string;
  item: T;
  itemKey: string;
  onDragEnd: () => void;
  onDragMove: (absoluteY: number) => void;
  onDragStart: (start: StartDrag) => void;
  renderItem: (item: T, context: ReorderableItemContext) => ReactNode;
  rowAccessibility?: ReorderRowAccessibility;
  shiftY: number;
  translationY: SharedValue<number>;
};

function ReorderableRow<T>({
  activeKey,
  context,
  handleTestID,
  item,
  itemKey,
  onDragEnd,
  onDragMove,
  onDragStart,
  renderItem,
  rowAccessibility,
  shiftY,
  translationY,
}: ReorderableRowProps<T>) {
  const { styles: themeStyles, tokens } = useTheme();
  const shift = useSharedValue(0);

  useEffect(() => {
    shift.value = withTiming(shiftY, { duration: 150 });
  }, [shift, shiftY]);

  const animatedStyle = useAnimatedStyle(() => {
    const isActive = activeKey.value === itemKey;
    return {
      elevation: isActive ? 4 : 0,
      transform: [{ translateY: isActive ? translationY.value : shift.value }],
      zIndex: isActive ? 20 : 0,
    };
  });

  const beginDrag = useCallback(() => {
    onDragStart({
      fromIndex: context.index,
      fromSection: context.sectionId,
      height: 0,
      key: itemKey,
    });
  }, [context.index, context.sectionId, itemKey, onDragStart]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .maxPointers(1)
        .activeOffsetY([-8, 8])
        .onStart(() => {
          activeKey.value = itemKey;
          translationY.value = 0;
          runOnJS(beginDrag)();
        })
        .onUpdate((event) => {
          translationY.value = event.translationY;
          runOnJS(onDragMove)(event.absoluteY);
        })
        .onFinalize(() => {
          translationY.value = 0;
          activeKey.value = '';
          runOnJS(onDragEnd)();
        }),
    [activeKey, beginDrag, itemKey, onDragEnd, onDragMove, translationY]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        body: {
          flex: 1,
        },
        row: {
          alignItems: 'center',
          borderBottomColor: themeStyles.border.borderColor,
          borderBottomWidth: context.isLast ? 0 : StyleSheet.hairlineWidth,
          flexDirection: 'row',
          paddingLeft: tokens.spacing.lg,
          paddingRight: tokens.spacing.sm,
          paddingVertical: tokens.spacing.sm,
        },
      }),
    [context.isLast, themeStyles, tokens]
  );

  const handleAccessibilityAction = (event: AccessibilityActionEvent) => {
    rowAccessibility?.onAction(event.nativeEvent.actionName);
  };

  return (
    <Animated.View
      accessibilityActions={
        rowAccessibility === undefined
          ? undefined
          : rowAccessibility.actions.map((action) => ({
              label: action.label,
              name: action.name,
            }))
      }
      accessibilityHint={rowAccessibility?.hint}
      accessibilityLabel={rowAccessibility?.label}
      accessibilityRole={rowAccessibility === undefined ? undefined : 'adjustable'}
      accessible={rowAccessibility !== undefined}
      collapsable={false}
      onAccessibilityAction={rowAccessibility === undefined ? undefined : handleAccessibilityAction}
      style={[styles.row, animatedStyle]}
    >
      <View accessible={false} style={styles.body}>
        {renderItem(item, context)}
      </View>
      <GestureDetector gesture={pan}>
        <ReorderHandle testID={handleTestID} />
      </GestureDetector>
    </Animated.View>
  );
}

export function ReorderableSections<T>({
  handleTestID,
  keyExtractor,
  onDragActiveChange,
  onDrop,
  renderItem,
  renderSection,
  rowAccessibility,
  sections,
}: ReorderableSectionsProps<T>) {
  const { tokens } = useTheme();
  const translationY = useSharedValue(0);
  const activeKey = useSharedValue('');
  const itemRefs = useRef<Record<string, View | null>>({});
  const sectionRefs = useRef<Record<string, View | null>>({});
  const layoutsRef = useRef<Record<string, SlotLayout>>({});
  const sectionBoundsRef = useRef<SectionBounds[]>([]);
  const startRef = useRef<StartDrag | null>(null);
  const hoverRef = useRef<HoverTarget | null>(null);
  const [hover, setHover] = useState<HoverTarget | null>(null);
  const [dragHeight, setDragHeight] = useState(0);
  const [fromFlatIndex, setFromFlatIndex] = useState<number | null>(null);

  const flatItems = useMemo(
    () => flattenReorderSections(sections, keyExtractor),
    [keyExtractor, sections]
  );

  const measureAll = useCallback((done: () => void) => {
    const itemKeys = Object.keys(itemRefs.current);
    const sectionIds = Object.keys(sectionRefs.current);
    let remaining = itemKeys.length + sectionIds.length;
    const finish = () => {
      remaining -= 1;
      if (remaining <= 0) {
        done();
      }
    };

    if (remaining === 0) {
      done();
      return;
    }

    const nextLayouts: Record<string, SlotLayout> = {};
    const nextSections: SectionBounds[] = [];

    for (const key of itemKeys) {
      const node = itemRefs.current[key];
      if (node === null || node === undefined) {
        finish();
        continue;
      }
      node.measureInWindow((_x, y, _width, height) => {
        nextLayouts[key] = { height, y };
        layoutsRef.current = nextLayouts;
        finish();
      });
    }

    for (const sectionId of sectionIds) {
      const node = sectionRefs.current[sectionId];
      if (node === null || node === undefined) {
        finish();
        continue;
      }
      node.measureInWindow((_x, y, _width, height) => {
        nextSections.push({ height, sectionId, y });
        sectionBoundsRef.current = nextSections;
        finish();
      });
    }
  }, []);

  const handleDragStart = useCallback(
    (start: StartDrag) => {
      startRef.current = start;
      hoverRef.current = null;
      activeKey.value = start.key;
      const knownHeight = layoutsRef.current[start.key]?.height;
      setDragHeight(knownHeight ?? start.height);
      const nextFromFlat = flatItems.findIndex((item) => item.key === start.key);
      setFromFlatIndex(nextFromFlat === -1 ? null : nextFromFlat);
      onDragActiveChange?.(true);
      measureAll(() => {
        const layout = layoutsRef.current[start.key];
        if (layout === undefined || startRef.current === null) {
          return;
        }
        startRef.current = { ...startRef.current, height: layout.height };
        setDragHeight(layout.height);
      });
    },
    [activeKey, flatItems, measureAll, onDragActiveChange]
  );

  const handleDragMove = useCallback(
    (absoluteY: number) => {
      const start = startRef.current;
      if (start === null) {
        return;
      }
      const next = resolveHover(
        flatItems,
        layoutsRef.current,
        sectionBoundsRef.current,
        start.key,
        absoluteY
      );
      hoverRef.current = next;
      setHover(next);
    },
    [flatItems]
  );

  const handleDragEnd = useCallback(() => {
    const start = startRef.current;
    const nextHover = hoverRef.current;
    startRef.current = null;
    hoverRef.current = null;
    setHover(null);
    setFromFlatIndex(null);
    setDragHeight(0);
    onDragActiveChange?.(false);
    if (start === null || nextHover === null) {
      return;
    }
    if (nextHover.sectionId === start.fromSection && nextHover.toIndex === start.fromIndex) {
      return;
    }
    onDrop({
      fromIndex: start.fromIndex,
      fromSection: start.fromSection,
      id: start.key,
      toIndex: nextHover.toIndex,
      toSection: nextHover.sectionId,
    });
  }, [onDragActiveChange, onDrop]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        measureAnchor: {
          minHeight: tokens.spacing['2xl'],
        },
      }),
    [tokens]
  );

  return (
    <View>
      {sections.map((section) => {
        const itemRows = (
          <View style={section.items.length === 0 ? styles.measureAnchor : undefined}>
            {section.items.map((item, index) => {
              const itemKey = keyExtractor(item);
              const context = {
                index,
                isLast: index === section.items.length - 1,
                sectionId: section.id,
              };
              const itemFlatIndex = flatItems.findIndex((entry) => entry.key === itemKey);
              const hoverFlat = hover?.flatIndex;
              const shiftY =
                fromFlatIndex === null || hoverFlat === undefined || itemFlatIndex === -1
                  ? 0
                  : computeItemShift(itemFlatIndex, fromFlatIndex, hoverFlat, dragHeight);

              return (
                <View
                  collapsable={false}
                  key={itemKey}
                  onLayout={() => {
                    itemRefs.current[itemKey]?.measureInWindow((_x, y, _width, height) => {
                      layoutsRef.current = {
                        ...layoutsRef.current,
                        [itemKey]: { height, y },
                      };
                    });
                  }}
                  ref={(node) => {
                    itemRefs.current[itemKey] = node;
                  }}
                >
                  <ReorderableRow
                    activeKey={activeKey}
                    context={context}
                    handleTestID={handleTestID?.(item, context)}
                    item={item}
                    itemKey={itemKey}
                    onDragEnd={handleDragEnd}
                    onDragMove={handleDragMove}
                    onDragStart={handleDragStart}
                    renderItem={renderItem}
                    rowAccessibility={rowAccessibility?.(item, context)}
                    shiftY={shiftY}
                    translationY={translationY}
                  />
                </View>
              );
            })}
          </View>
        );

        return (
          <View
            collapsable={false}
            key={section.id}
            onLayout={() => {
              sectionRefs.current[section.id]?.measureInWindow((_x, y, _width, height) => {
                const next = sectionBoundsRef.current.filter(
                  (bounds) => bounds.sectionId !== section.id
                );
                next.push({ height, sectionId: section.id, y });
                sectionBoundsRef.current = next;
              });
            }}
            ref={(node) => {
              sectionRefs.current[section.id] = node;
            }}
          >
            {renderSection(section.id, itemRows)}
          </View>
        );
      })}
    </View>
  );
}
