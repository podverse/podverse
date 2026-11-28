import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { normalizePlaylistTagName } from '@podverse/helpers/playlistTag';

import { playlistTagSearchQuery, TAG_SEARCH_DEBOUNCE_MS, TextField } from '../../components/form';
import {
  chipFacePadding,
  chipLabelTypography,
  filterChipChrome,
} from '../../components/form/chipChrome';
import { AppOverlay } from '../../components/overlay';
import { chipRowGap } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';

/** Keeps a long tag name on one line beside the sort chip. */
const TAG_CHIP_MAX_WIDTH = 180;

/** The suggestion list scrolls inside the sheet so a row stays reachable with the keyboard up. */
const SUGGESTION_LIST_MAX_HEIGHT = 220;

/** Same row height as the overflow menu's Cancel block. */
const SHEET_ACTION_MIN_HEIGHT = 62;

type TagSheetNotice = 'error' | 'idle' | 'searching' | 'too_long';

export type BrowsePlaylistTagChipProps = {
  onChange: (tag: string | null) => void;
  onSearch: (query: string) => Promise<string[]>;
  tag: string | null;
};

const createStyles = ({ styles: themeStyles, tokens }: ThemedStylesTheme) => {
  const chrome = filterChipChrome(
    tokens,
    { borderColor: themeStyles.border.borderColor, textColor: themeStyles.textPrimary.color },
    true
  );

  return StyleSheet.create({
    backdrop: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      flex: 1,
      justifyContent: 'flex-end',
    },
    body: {
      gap: tokens.spacing.md,
    },
    cancel: {
      alignItems: 'center',
      backgroundColor: tokens.background.quaternary,
      borderColor: themeStyles.border.borderColor,
      borderRadius: tokens.radii.md,
      borderWidth: 1,
      justifyContent: 'center',
      marginTop: tokens.spacing.md,
      minHeight: SHEET_ACTION_MIN_HEIGHT,
    },
    cancelLabel: {
      ...typography.heading,
      color: themeStyles.textPrimary.color,
      fontWeight: '700',
      textAlign: 'center',
    },
    chip: {
      alignItems: 'center',
      borderWidth: 1,
      flexDirection: 'row',
      flexShrink: 1,
      marginRight: chipRowGap(),
      maxWidth: TAG_CHIP_MAX_WIDTH,
      ...chipFacePadding(tokens.spacing),
      ...chrome.chip,
    },
    clear: {
      alignItems: 'center',
      backgroundColor: tokens.background.tertiary,
      borderColor: themeStyles.border.borderColor,
      borderRadius: tokens.radii.md,
      borderWidth: 1,
      justifyContent: 'center',
      marginTop: tokens.spacing.md,
      minHeight: SHEET_ACTION_MIN_HEIGHT,
    },
    error: {
      ...typography.body,
      color: tokens.text.danger,
    },
    label: {
      ...chipLabelTypography,
      flexShrink: 1,
      ...chrome.label,
    },
    pressed: {
      opacity: 0.7,
    },
    searching: {
      ...typography.body,
      color: themeStyles.textSecondary.color,
    },
    selected: {
      ...typography.body,
      color: themeStyles.textSecondary.color,
    },
    sheet: {
      paddingHorizontal: tokens.spacing.lg,
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
    suggestions: {
      backgroundColor: tokens.background.primary,
      borderColor: tokens.border.opaque,
      borderRadius: tokens.radii.md,
      borderWidth: 1,
      maxHeight: SUGGESTION_LIST_MAX_HEIGHT,
      paddingVertical: tokens.spacing.sm,
      width: '100%',
    },
    title: {
      ...typography.heading,
      color: themeStyles.textPrimary.color,
      fontWeight: '700',
    },
  });
};

/**
 * One playlist-tag filter. The face opens a sheet. Return and a suggestion apply one folded
 * name. Cancel, the backdrop, and Android back drop the typed text and leave the applied tag
 * alone.
 */
export function BrowsePlaylistTagChip({ onChange, onSearch, tag }: BrowsePlaylistTagChipProps) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState<TagSheetNotice>('idle');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsFor, setSuggestionsFor] = useState<string | null>(null);
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;
  const searchGenerationRef = useRef(0);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const clearSearchTimer = (): void => {
    if (searchTimerRef.current !== null) {
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (searchTimerRef.current !== null) {
        clearTimeout(searchTimerRef.current);
        searchTimerRef.current = null;
      }
    };
  }, []);

  const resetSheetText = (): void => {
    clearSearchTimer();
    searchGenerationRef.current += 1;
    setDraft('');
    setNotice('idle');
    setSuggestions([]);
    setSuggestionsFor(null);
  };

  const closeSheet = (): void => {
    resetSheetText();
    setIsOpen(false);
  };

  const openSheet = (): void => {
    resetSheetText();
    setIsOpen(true);
  };

  const applyTag = (next: string | null): void => {
    onChange(next);
    closeSheet();
  };

  const loadSuggestions = async (query: string, generation: number): Promise<void> => {
    setNotice('searching');
    setSuggestions([]);
    setSuggestionsFor(null);
    try {
      const next = await onSearchRef.current(query);
      if (!isMountedRef.current || generation !== searchGenerationRef.current) {
        return;
      }
      setSuggestions(next);
      setSuggestionsFor(query);
      setNotice('idle');
    } catch {
      if (!isMountedRef.current || generation !== searchGenerationRef.current) {
        return;
      }
      setSuggestions([]);
      setSuggestionsFor(null);
      setNotice('error');
    }
  };

  const handleDraftChange = (value: string): void => {
    setDraft(value);
    setNotice('idle');
    clearSearchTimer();
    searchGenerationRef.current += 1;
    const generation = searchGenerationRef.current;
    const query = playlistTagSearchQuery(value);
    if (query === null) {
      setSuggestions([]);
      setSuggestionsFor(null);
      return;
    }

    searchTimerRef.current = setTimeout(() => {
      searchTimerRef.current = null;
      void loadSuggestions(query, generation);
    }, TAG_SEARCH_DEBOUNCE_MS);
  };

  const submitDraft = (): void => {
    const folded = normalizePlaylistTagName(draft);
    if (!folded.ok) {
      if (folded.reason === 'too_long') {
        clearSearchTimer();
        searchGenerationRef.current += 1;
        setSuggestions([]);
        setSuggestionsFor(null);
        setNotice('too_long');
      }
      return;
    }

    applyTag(folded.name);
  };

  const query = playlistTagSearchQuery(draft);
  const visibleSuggestions =
    notice === 'idle' && query !== null && suggestionsFor === query ? suggestions : [];
  const faceLabel = tag === null ? t('filters.tag.tag') : tag;
  let errorMessage: string | null = null;
  if (notice === 'error') {
    errorMessage = t('errors.generic');
  } else if (notice === 'too_long') {
    errorMessage = t('filters.tag.too_long');
  }

  const sheetInset = {
    paddingBottom: Math.max(insets.bottom, tokens.spacing['2xl']),
  };

  return (
    <>
      <Pressable
        accessibilityLabel={tag === null ? undefined : t('filters.tag.selected', { tag })}
        accessibilityRole="button"
        accessibilityState={{ selected: tag !== null }}
        onPress={openSheet}
        style={styles.chip}
        testID="browse-playlist-tag-button"
      >
        <Text ellipsizeMode="tail" numberOfLines={1} style={styles.label}>
          {faceLabel}
        </Text>
      </Pressable>
      <AppOverlay animation="none" onRequestClose={closeSheet} visible={isOpen}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.backdrop}
        >
          <Pressable
            accessible={false}
            onPress={closeSheet}
            style={StyleSheet.absoluteFill}
            testID="browse-playlist-tag-backdrop"
          />
          <View
            accessibilityViewIsModal
            style={[styles.sheet, sheetInset]}
            testID="browse-playlist-tag-sheet"
          >
            <View style={styles.body}>
              <Text accessibilityRole="header" style={styles.title}>
                {t('filters.tag.tag')}
              </Text>
              {tag !== null ? (
                <Text style={styles.selected}>{t('filters.tag.selected', { tag })}</Text>
              ) : null}
              <TextField
                accessibilityLabel={t('filters.tag.tag')}
                autoCapitalize="none"
                autoCorrect={false}
                clearAccessibilityLabel={t('filters.tag.clear_text')}
                clearTestID="browse-playlist-tag-input-clear"
                onChangeText={handleDraftChange}
                onSubmitEditing={submitDraft}
                placeholder={t('filters.tag.placeholder')}
                returnKeyType="done"
                testID="browse-playlist-tag-input"
                value={draft}
              />
              {notice === 'searching' ? (
                <Text
                  accessibilityLiveRegion="polite"
                  style={styles.searching}
                  testID="browse-playlist-tag-searching"
                >
                  {t('filters.tag.searching')}
                </Text>
              ) : null}
              {errorMessage !== null ? (
                <Text
                  accessibilityLiveRegion="polite"
                  style={styles.error}
                  testID="browse-playlist-tag-error"
                >
                  {errorMessage}
                </Text>
              ) : null}
              {visibleSuggestions.length > 0 ? (
                <ScrollView
                  accessibilityLabel={t('filters.tag.suggestions')}
                  keyboardShouldPersistTaps="handled"
                  style={styles.suggestions}
                  testID="browse-playlist-tag-suggestions"
                >
                  {visibleSuggestions.map((suggestion, index) => (
                    <Pressable
                      accessibilityRole="button"
                      key={`${suggestion}-${index}`}
                      onPress={() => {
                        applyTag(suggestion);
                      }}
                      style={({ pressed }) => [
                        styles.suggestion,
                        pressed ? styles.suggestionPressed : null,
                      ]}
                      testID={`browse-playlist-tag-suggestion-${index}`}
                    >
                      <Text ellipsizeMode="tail" numberOfLines={1} style={styles.suggestionLabel}>
                        {suggestion}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}
            </View>
            {tag !== null ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  applyTag(null);
                }}
                style={({ pressed }) => [styles.clear, pressed ? styles.pressed : null]}
                testID="browse-playlist-tag-clear"
              >
                <Text numberOfLines={1} style={styles.cancelLabel}>
                  {t('misc.clear_filter')}
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={closeSheet}
              style={({ pressed }) => [styles.cancel, pressed ? styles.pressed : null]}
              testID="browse-playlist-tag-cancel"
            >
              <Text numberOfLines={1} style={styles.cancelLabel}>
                {t('misc.cancel')}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </AppOverlay>
    </>
  );
}
