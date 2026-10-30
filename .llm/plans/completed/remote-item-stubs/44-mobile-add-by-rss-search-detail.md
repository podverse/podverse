**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 44 — Mobile Add by RSS remote feed screen

The mobile twin of plan 42: a screen for a remote feed the index provider does not know, with
minimal information (the reference's title, else the feed URL, plus the URL) and an **Add by
RSS** action (R36). It renders plan 43's `SearchDetailView`, so the provider screen and this
screen share one component (R16). The action reuses `useAddByRssAddFlow`, the hook behind the Add
by RSS add screen.

- **Route name:** `AddByRssRemoteFeedDetail`, in `AddByRssDetailStackParamList`, registered on
  the Home, Library, Browse, and Search stacks beside `AddByRssCredentials`.
- **Params:** `{ feedUrl: string; title?: string }`. Plan 46 navigates here.
- No deep link (it is only reached from a podroll row).

## Rows

R14, R15, R16, R22, R36

## Runs after

43

## Files

apps/mobile/src/screens/home/addByRss/addByRssStackParams.ts
apps/mobile/src/screens/rss/AddByRssRemoteFeedScreen.tsx
apps/mobile/src/navigation/index.tsx
release-notes/scratchpad.md

## Params — `addByRssStackParams.ts`

```ts
export type AddByRssDetailStackParamList = {
  AddByRssCredentials: { feedIdText: string };
  AddByRssEpisodeDetail: { feedIdText: string; itemKey: string };
  AddByRssLivestreamDetail: { feedIdText: string; liveItemKey: string };
  AddByRssPodcastDetail: { feedIdText: string };
  /** A remote feed the index provider does not know. `title` is the reference's own title. */
  AddByRssRemoteFeedDetail: { feedUrl: string; title?: string };
  AddByRssTrackDetail: { feedIdText: string; itemKey: string };
};
```

## Navigation — `apps/mobile/src/navigation/index.tsx`

- Add `AddByRssRemoteFeedDetail: 'AddByRssRemoteFeedDetail',` after `AddByRssPodcastDetail` in
  every route-name object that has `AddByRssCredentials` (the Home, Search, Library, and Browse
  objects near lines 166, 196, 206, and 232).
- Register the screen in each of the four stacks, right after that stack's `AddByRssCredentials`
  `Stack.Screen` (near lines 1101, 1211, 1271, 1413):

  ```tsx
  <HomeStack.Screen
    component={AddByRssRemoteFeedScreen}
    name={HOME_STACK_ROUTES.AddByRssRemoteFeedDetail}
    options={{ title: t('features.add_by_rss.label') }}
  />
  ```

  with each stack's own navigator and route object.
- No entry in the linking configs.

## Screen — `apps/mobile/src/screens/rss/AddByRssRemoteFeedScreen.tsx` (new)

`NativeStackScreenProps<AddByRssDetailStackParamList, 'AddByRssRemoteFeedDetail'>`. Beside
`AddByRssAddScreen.tsx`, with the same theme styles and `useOfflineMode` use.

```ts
const { feedUrl } = route.params;
const title = route.params.title?.trim() || null;
const [noticeKey, setNoticeKey] = useState<string | null>(null);

const { addErrorKey, addFeed, isAdding } = useAddByRssAddFlow({
  inputValue: feedUrl,
  onAfterAdd: async () => {
    const record = await addByRssRepository.getFeedByUrl(feedUrl);
    if (record !== null) {
      navigation.replace('AddByRssPodcastDetail', { feedIdText: record.idText });
      return;
    }
    navigation.goBack();
  },
  onNotice: setNoticeKey,
  setInputValue: () => {},
});
```

States, in order:

1. Offline Mode → `<MobileScreenContainer testID="add-by-rss-remote-feed-screen">` wrapping
   `<ListEmpty messageKey={OFFLINE_UNAVAILABLE_MESSAGE_KEY} testID="add-by-rss-remote-feed-offline-unavailable" />`,
   as `AddByRssAddScreen`'s offline branch does.
2. On mount, `addByRssRepository.getFeedByUrl(feedUrl)`. A record → `navigation.replace('AddByRssPodcastDetail', { feedIdText: record.idText })`
   (the detail screen handles followed and listed-only records). Until that read finishes, render
   the loaded state; it is local and fast.
3. Loaded:

   ```tsx
   <View style={styles.container} testID="add-by-rss-remote-feed-screen">
     <SearchDetailView
       title={title ?? feedUrl}
       author={null}
       description={title !== null ? feedUrl : null}
       imageUrl={null}
       helperMessage={t('features.add_by_rss.remote_feed_explanation')}
       primaryAction={{ label: t('features.add_by_rss.label'), loading: isAdding, onPress: handleAdd }}
       progressMessage={null}
       errorMessage={addErrorKey !== null ? t(addErrorKey) : null}
       noticeMessage={noticeKey !== null ? t(noticeKey) : null}
       testIDs={{
         scroll: 'add-by-rss-remote-feed-scroll',
         image: 'add-by-rss-remote-feed-image',
         helper: 'add-by-rss-remote-feed-helper',
         actionButton: 'add-by-rss-remote-feed-add-button',
         progress: 'add-by-rss-remote-feed-adding',
         error: 'add-by-rss-remote-feed-add-error',
         notice: 'add-by-rss-remote-feed-add-notice',
       }}
     />
   </View>
   ```

   `styles.container` is the same `{ backgroundColor: themeStyles.screen.backgroundColor, flex: 1 }`
   `PodcastIndexFeedPreviewScreen` uses. `MobileScreenContainer` is not used for the loaded
   state because it renders its own `ScrollView`, and `SearchDetailView` already scrolls.

`handleAdd` is `useCallback(() => { void addFeed(); }, [addFeed])`, exactly as
`AddByRssAddScreen.handleSubmit`; the hook owns the access gate, the login prompt, the follow,
and the parse. This screen has no username and password fields; a feed that needs them shows the
existing Needs Username and Password state on its detail screen after the add.

## Reuse

- `SearchDetailView` (plan 43), `useAddByRssAddFlow`, `addByRssRepository.getFeedByUrl`.
- Copy from plan 40 (`features.add_by_rss.remote_feed_explanation`) and the existing
  `features.add_by_rss.label`.

## Tests

No pure logic is added. Plan 46's Maestro flow opens this screen from an Add by RSS podroll row
and presses **Add by RSS**; the existing `apps/mobile/e2e/add-by-rss.yaml` covers the hook.

## Release scratchpad

```markdown
## Mobile Add by RSS screen for feeds the index does not know

- Surfaces: mobile
- Change: new Add by RSS screen for a remote feed Podcast Index does not list. It shows the
  feed's title (or URL) and an Add by RSS button that follows and parses it like the Add by RSS
  add screen, then opens it. It uses the same layout as the Podcast Index preview screen. Opening
  it for a feed already on the device goes straight to that feed.
- Who notices: mobile listeners who tap a podroll entry in an Add by RSS feed that Podcast Index
  does not list
- Operator steps: none
```
