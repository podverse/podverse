import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  BottomChromeScrollSpacer,
  useBottomChromeScrollIndicatorInsets,
} from '../../theme/bottomChromeOverlayInset';
import {
  PREVIEW_IDENTITY_ARTWORK_EDGE,
  previewIdentityArtworkGap,
  previewIdentityBylineGap,
  previewIdentityDescriptionGap,
  screenBodyInsets,
} from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { HelperNote } from '../feedback/HelperNote';
import { Button, CoverImage } from '../primitives';

export type SearchDetailViewTestIDs = {
  scroll: string;
  image: string;
  helper: string;
  actionButton: string;
  progress: string;
  error: string;
  notice: string;
};

export type SearchDetailViewProps = {
  title: string;
  author: string | null;
  description: string | null;
  /** null renders the CoverImage placeholder. */
  imageUrl: string | null;
  helperMessage: string;
  primaryAction: { label: string; loading: boolean; onPress: () => void };
  /** Shown under the button while the action runs. */
  progressMessage: string | null;
  errorMessage: string | null;
  noticeMessage: string | null;
  testIDs: SearchDetailViewTestIDs;
};

/**
 * Loaded search-detail body: cover, title, author, description, explainer, and one action.
 * Callers own fetching, navigation, and which provider the action talks to.
 */
export function SearchDetailView({
  title,
  author,
  description,
  imageUrl,
  helperMessage,
  primaryAction,
  progressMessage,
  errorMessage,
  noticeMessage,
  testIDs,
}: SearchDetailViewProps) {
  const { styles: themeStyles, tokens } = useTheme();
  const scrollIndicatorInsets = useBottomChromeScrollIndicatorInsets();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        author: {
          ...typography.prose,
          color: themeStyles.textSecondary.color,
          marginTop: previewIdentityBylineGap(tokens.spacing),
        },
        content: {
          ...screenBodyInsets(tokens.spacing),
          gap: tokens.spacing.lg,
          paddingBottom: tokens.spacing.lg,
        },
        description: {
          ...typography.prose,
          color: themeStyles.textPrimary.color,
          marginTop: previewIdentityDescriptionGap(tokens.spacing),
        },
        image: {
          height: PREVIEW_IDENTITY_ARTWORK_EDGE,
          width: PREVIEW_IDENTITY_ARTWORK_EDGE,
        },
        message: {
          ...typography.body,
          color: themeStyles.textPrimary.color,
        },
        title: {
          ...typography.display,
          color: themeStyles.textPrimary.color,
          marginTop: previewIdentityArtworkGap(tokens.spacing),
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      scrollIndicatorInsets={scrollIndicatorInsets}
      testID={testIDs.scroll}
    >
      <View>
        <CoverImage
          accessibilityLabel={title}
          decodeEdge={PREVIEW_IDENTITY_ARTWORK_EDGE}
          style={styles.image}
          testID={testIDs.image}
          uri={imageUrl}
        />
        <Text style={styles.title}>{title}</Text>
        {author !== null ? <Text style={styles.author}>{author}</Text> : null}
        {description !== null ? <Text style={styles.description}>{description}</Text> : null}
      </View>

      <HelperNote message={helperMessage} scale="reading" testID={testIDs.helper} />

      <Button
        fullWidth
        label={primaryAction.label}
        loading={primaryAction.loading}
        onPress={primaryAction.onPress}
        size="form"
        testID={testIDs.actionButton}
      />

      {progressMessage !== null ? (
        <Text style={styles.message} testID={testIDs.progress}>
          {progressMessage}
        </Text>
      ) : null}

      {errorMessage !== null ? (
        <Text style={styles.message} testID={testIDs.error}>
          {errorMessage}
        </Text>
      ) : null}

      {noticeMessage !== null ? (
        <Text style={styles.message} testID={testIDs.notice}>
          {noticeMessage}
        </Text>
      ) : null}
      <BottomChromeScrollSpacer />
    </ScrollView>
  );
}
