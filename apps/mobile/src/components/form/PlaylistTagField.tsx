import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import type { TextInputInstance } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { chipRowGap } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { chipFacePadding, chipLabelTypography } from './chipChrome';
import type { PlaylistTagDraftResult } from './playlistTagDraft';
import {
  commitPlaylistTagDraft,
  playlistTagSearchQuery,
  TAG_SEARCH_DEBOUNCE_MS,
} from './playlistTagDraft';
import { TextField } from './TextField';

const REMOVE_ICON_SIZE = 18;
const REMOVE_HIT_SLOP = 8;

type PlaylistTagFieldShared = {
  /** Chips, in this order. */
  tags: readonly string[];
  testID: string;
};

type PlaylistTagFieldReadOnly = PlaylistTagFieldShared & {
  editable: false;
};

type PlaylistTagFieldEditable = PlaylistTagFieldShared & {
  /** Accessible name of the control that clears the text box. The X clears the draft only. */
  clearDraftAccessibilityLabel: string;
  /**
   * Text still in the box. The screen owns it so Save can commit a name that was never turned
   * into a chip.
   */
  draft: string;
  editable: true;
  /** Shown when non-empty. Does not block Return, a suggestion, or the draft Save commits. */
  errorMessage?: string;
  /** Accessible name of the box. The visible title sits outside this control. */
  inputAccessibilityLabel: string;
  /**
   * Shown only when the box is hidden because `maxCount` is reached and this string is
   * non-empty. The screen builds the sentence from the live count.
   */
  limitMessage?: string;
  /** When `tags.length` reaches this, the box hides. Omit for no cap. */
  maxCount?: number;
  /** Forwarded to the box. Typing stops there. Omit for no cap. This control shows no sentence. */
  maxLength?: number;
  /** Next chip list after an add or a remove. Called only when the list changes. */
  onChange: (tags: readonly string[]) => void;
  onDraftChange: (draft: string) => void;
  /** Trimmed query, or `''` when the box is cleared. The screen performs the search. */
  onSearch: (query: string) => void;
  /** Instruction in the empty box. Not the field title. */
  placeholder: string;
  /** Accessible name of that chip's remove control. The screen includes the tag text. */
  removeAccessibilityLabel: (tag: string) => string;
  /** True while the screen's request is in flight. */
  searching: boolean;
  searchingLabel: string;
  /** Matches for `suggestionsFor`. A slower response for an older query stays hidden. */
  suggestions: readonly string[];
  suggestionsFor: string;
};

export type PlaylistTagFieldProps = PlaylistTagFieldReadOnly | PlaylistTagFieldEditable;

const createPlaylistTagFieldStyles = ({ styles: themeStyles, tokens }: ThemedStylesTheme) =>
  StyleSheet.create({
    chip: {
      alignItems: 'center',
      backgroundColor: tokens.background.secondary,
      borderColor: themeStyles.border.borderColor,
      borderRadius: tokens.radii.round,
      borderWidth: 1,
      flexDirection: 'row',
      flexShrink: 1,
      gap: tokens.spacing.sm,
      maxWidth: '100%',
      ...chipFacePadding(tokens.spacing),
    },
    chipLabel: {
      ...chipLabelTypography,
      color: themeStyles.textPrimary.color,
      flexShrink: 1,
    },
    chipWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: chipRowGap(),
    },
    column: {
      gap: tokens.spacing.md,
    },
    error: {
      ...typography.body,
      color: tokens.text.danger,
    },
    limit: {
      ...typography.body,
      color: themeStyles.textSecondary.color,
    },
    menu: {
      backgroundColor: tokens.background.primary,
      borderColor: tokens.border.opaque,
      borderRadius: tokens.radii.md,
      borderWidth: 1,
      marginTop: tokens.spacing.sm,
      paddingVertical: tokens.spacing.sm,
      width: '100%',
    },
    remove: {
      flexShrink: 0,
    },
    searching: {
      ...typography.body,
      color: themeStyles.textSecondary.color,
      margin: tokens.spacing.md,
      paddingHorizontal: tokens.spacing.xl,
      paddingVertical: tokens.spacing.md,
    },
    suggestion: {
      borderRadius: tokens.radii.md,
      margin: tokens.spacing.md,
      paddingHorizontal: tokens.spacing.xl,
      paddingVertical: tokens.spacing.md,
    },
    suggestionLabel: {
      ...typography.body,
      color: tokens.text.primary,
    },
    suggestionPressed: {
      backgroundColor: tokens.background.opaque,
    },
  });

type PlaylistTagFieldStyles = ReturnType<typeof createPlaylistTagFieldStyles>;

function isNonEmptyString(value: string | undefined): value is string {
  return value !== undefined && value !== '';
}

/**
 * Return leaves the keyboard up. A suggestion press moves focus off the field, so the caret is
 * put back on the next frame and another tag can be typed.
 */
function focusTagInput(input: { current: TextInputInstance | null }): void {
  input.current?.focus();
  requestAnimationFrame(() => {
    input.current?.focus();
  });
}

function tagChipRow(input: {
  iconColor: string;
  onRemove?: (index: number) => void;
  removeAccessibilityLabel?: (tag: string) => string;
  styles: PlaylistTagFieldStyles;
  tags: readonly string[];
  testID: string;
}): ReactNode {
  const onRemove = input.onRemove;
  const removeAccessibilityLabel = input.removeAccessibilityLabel;
  if (input.tags.length === 0) {
    return null;
  }

  return (
    <View style={input.styles.chipWrap}>
      {input.tags.map((tag, index) => (
        <View
          accessible={false}
          key={`${input.testID}-tag-${index}`}
          style={input.styles.chip}
          testID={`${input.testID}-tag-${index}`}
        >
          <Text ellipsizeMode="tail" numberOfLines={1} style={input.styles.chipLabel}>
            {tag}
          </Text>
          {onRemove !== undefined && removeAccessibilityLabel !== undefined ? (
            <Pressable
              accessibilityLabel={removeAccessibilityLabel(tag)}
              accessibilityRole="button"
              hitSlop={REMOVE_HIT_SLOP}
              onPress={() => {
                onRemove(index);
              }}
              style={input.styles.remove}
              testID={`${input.testID}-tag-${index}-remove`}
            >
              <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <Ionicons color={input.iconColor} name="close" size={REMOVE_ICON_SIZE} />
              </View>
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function applyCommitResult(
  result: PlaylistTagDraftResult,
  onChange: (tags: readonly string[]) => void,
  onDraftChange: (draft: string) => void,
  inputRef: { current: TextInputInstance | null }
): void {
  if (result.status === 'added') {
    onChange(result.tags);
    onDraftChange('');
    focusTagInput(inputRef);
    return;
  }

  if (result.status === 'duplicate' || result.status === 'empty') {
    onDraftChange('');
    focusTagInput(inputRef);
  }
}

/**
 * Playlist tags as chips, plus a text box when the screen is editing.
 *
 * Return commits the typed name. A suggestion press commits that suggestion's spelling. Blur
 * does not commit: leaving the screen blurs the field, and committing there races Save. The
 * screen commits whatever is still in the box. The list under the box is the screen's result
 * for the current trimmed draft; an older result stays hidden. Return is how a new name
 * becomes a chip.
 */
export function PlaylistTagField(props: PlaylistTagFieldProps) {
  const { styles: themeStyles } = useTheme();
  const styles = useThemedStyles(createPlaylistTagFieldStyles);
  const inputRef = useRef<TextInputInstance | null>(null);
  const onSearchRef = useRef<(query: string) => void>(() => {});
  const lastSentQueryRef = useRef<string | null>(null);

  // A new `onSearch` identity must not restart the timer.
  if (props.editable) {
    onSearchRef.current = props.onSearch;
  }

  const draft = props.editable ? props.draft : '';

  useEffect(() => {
    if (!props.editable) {
      return;
    }

    const query = playlistTagSearchQuery(draft);
    if (query === null) {
      // An empty draft is not debounced. The first empty draft does not search, because
      // nothing has been sent yet. Clearing a draft that already searched drops that query.
      if (lastSentQueryRef.current !== null && lastSentQueryRef.current !== '') {
        lastSentQueryRef.current = '';
        onSearchRef.current('');
      }
      return;
    }

    if (query === lastSentQueryRef.current) {
      return;
    }

    const timeoutId = setTimeout(() => {
      lastSentQueryRef.current = query;
      onSearchRef.current(query);
    }, TAG_SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [draft, props.editable]);

  if (!props.editable) {
    if (props.tags.length === 0) {
      return null;
    }

    return (
      <View style={styles.column} testID={props.testID}>
        {tagChipRow({
          iconColor: themeStyles.textSecondary.color,
          styles,
          tags: props.tags,
          testID: props.testID,
        })}
      </View>
    );
  }

  const atMax = props.maxCount !== undefined && props.tags.length >= props.maxCount;
  const query = playlistTagSearchQuery(props.draft);
  const suggestionsAreCurrent = query !== null && props.suggestionsFor === query;
  const currentSuggestions = suggestionsAreCurrent ? props.suggestions : [];
  const showSuggestionRows = currentSuggestions.length > 0;
  const showSearchingLine = query !== null && props.searching && !showSuggestionRows;
  const showList = showSuggestionRows || showSearchingLine;

  const commitText = (text: string): void => {
    const result = commitPlaylistTagDraft({
      tags: props.tags,
      draft: text,
      maxCount: props.maxCount,
      maxLength: props.maxLength,
    });
    applyCommitResult(result, props.onChange, props.onDraftChange, inputRef);
  };

  const removeTag = (index: number): void => {
    props.onChange(props.tags.filter((_, tagIndex) => tagIndex !== index));
  };

  return (
    <View style={styles.column} testID={props.testID}>
      {tagChipRow({
        iconColor: themeStyles.textSecondary.color,
        onRemove: removeTag,
        removeAccessibilityLabel: props.removeAccessibilityLabel,
        styles,
        tags: props.tags,
        testID: props.testID,
      })}
      {atMax ? null : (
        <View>
          <TextField
            accessibilityLabel={props.inputAccessibilityLabel}
            autoCapitalize="none"
            autoCorrect={false}
            clearAccessibilityLabel={props.clearDraftAccessibilityLabel}
            clearTestID={`${props.testID}-input-clear`}
            inputRef={inputRef}
            maxLength={props.maxLength}
            onChangeText={props.onDraftChange}
            onSubmitEditing={() => {
              commitText(props.draft);
            }}
            placeholder={props.placeholder}
            returnKeyType="done"
            submitBehavior="submit"
            testID={`${props.testID}-input`}
            value={props.draft}
          />
          {showList ? (
            <View
              accessibilityLiveRegion="polite"
              accessibilityRole={showSuggestionRows ? 'menu' : undefined}
              style={styles.menu}
              testID={`${props.testID}-suggestions`}
            >
              {showSearchingLine ? (
                <Text style={styles.searching} testID={`${props.testID}-searching`}>
                  {props.searchingLabel}
                </Text>
              ) : (
                currentSuggestions.map((suggestion, index) => (
                  <Pressable
                    accessibilityLabel={suggestion}
                    accessibilityRole="menuitem"
                    key={`${props.testID}-suggestion-${index}`}
                    onPress={() => {
                      commitText(suggestion);
                    }}
                    style={({ pressed }) => [
                      styles.suggestion,
                      pressed ? styles.suggestionPressed : null,
                    ]}
                    testID={`${props.testID}-suggestion-${index}`}
                  >
                    <Text ellipsizeMode="tail" numberOfLines={1} style={styles.suggestionLabel}>
                      {suggestion}
                    </Text>
                  </Pressable>
                ))
              )}
            </View>
          ) : null}
        </View>
      )}
      {atMax && isNonEmptyString(props.limitMessage) ? (
        <Text style={styles.limit} testID={`${props.testID}-limit`}>
          {props.limitMessage}
        </Text>
      ) : null}
      {isNonEmptyString(props.errorMessage) ? (
        <Text
          accessibilityLiveRegion="polite"
          style={styles.error}
          testID={`${props.testID}-error`}
        >
          {props.errorMessage}
        </Text>
      ) : null}
    </View>
  );
}
