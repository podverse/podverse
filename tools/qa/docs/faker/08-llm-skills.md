# Fake Data Generator - LLM Skills and Migration Awareness

## Overview

This document defines the Cursor rules/skills that ensure the LLM is reminded to update the faker module whenever database migrations modify the entity structure in `podverse-orm`.

> **⚠️ Future Update Required:** After the add-by-rss data generation work is completed (see [00-index.md](./00-index.md#excluded-features-deferred)), this skills document must be updated to include:
> - `AccountFollowingAddByRSSChannel` generator mapping
> - `PlaylistResource.add_by_rss_*` field generation guidance
> - `QueueResource.add_by_rss_*` field generation guidance
> - JSON schema validation for add-by-rss data structures

## Cursor Rules File

Create a `.cursor/rules/faker-migrations.mdc` file in the workspace root:

```markdown
---
description: Rules for maintaining the podverse-qa faker module when database entities change
globs:
  - "podverse-orm/src/entities/**/*.ts"
  - "podverse-orm/src/db/entities.ts"
alwaysApply: false
---

# Podverse Faker Migration Rules

When modifying database entities in `podverse-orm`, you MUST also update the corresponding faker generators in `podverse-qa`.

## Entity to Generator Mapping

| Entity Location | Faker Generator Location |
|-----------------|--------------------------|
| `podverse-orm/src/entities/account/*.ts` | `podverse-qa/src/faker/generators/account/` |
| `podverse-orm/src/entities/feed/*.ts` | `podverse-qa/src/faker/generators/feed/` |
| `podverse-orm/src/entities/channel/*.ts` | `podverse-qa/src/faker/generators/channel/` |
| `podverse-orm/src/entities/item/*.ts` | `podverse-qa/src/faker/generators/item/` |
| `podverse-orm/src/entities/liveItem/*.ts` | `podverse-qa/src/faker/generators/item/liveItem.ts` |
| `podverse-orm/src/entities/playlist/*.ts` | `podverse-qa/src/faker/generators/userContent/playlist*.ts` |
| `podverse-orm/src/entities/queue/*.ts` | `podverse-qa/src/faker/generators/userContent/queue*.ts` |
| `podverse-orm/src/entities/clip.ts` | `podverse-qa/src/faker/generators/userContent/clip.ts` |
| `podverse-orm/src/entities/stats/*.ts` | `podverse-qa/src/faker/generators/stats/` |

## When to Update Faker

### MUST Update When:
1. Adding a new entity file
2. Adding new columns to existing entities
3. Changing column types or constraints
4. Adding new relationships between entities
5. Modifying enum values that affect entity columns

### MAY Skip Faker Update When:
1. Adding indexes (no data changes)
2. Renaming internal methods
3. Adding TypeORM decorators that don't change data structure
4. Modifying entity services (not entities themselves)

## Checklist for Entity Changes

When modifying an entity, ensure:

- [ ] Corresponding generator exists in `podverse-qa/src/faker/generators/`
- [ ] Generator interface matches entity structure
- [ ] All required fields are generated
- [ ] Foreign key relationships are properly handled
- [ ] Enum values use correct lookup table references
- [ ] URL fields point to `http://localhost:2111` media server
- [ ] String fields respect `DATABASE_CONSTANTS` length limits
- [ ] Documentation in `podverse-qa/docs/faker/` is updated

## Example: Adding a New Entity

When adding `podverse-orm/src/entities/channel/channelNewFeature.ts`:

1. Create generator: `podverse-qa/src/faker/generators/channel/channelNewFeature.ts`
2. Export from: `podverse-qa/src/faker/generators/channel/index.ts`
3. Add to orchestrator: `podverse-qa/src/faker/generators/channel/index.ts`
4. Update docs: `podverse-qa/docs/faker/05-feed-channel-generators.md`

## Example: Adding a New Column

When adding a column to `podverse-orm/src/entities/item/item.ts`:

1. Update interface in `podverse-qa/src/faker/generators/item/item.ts`
2. Add generation logic for the new field
3. Update `toSQL()` method if present
4. Test that generated data passes validation
```

## Cursor Rules Integration

Add to `.cursorrules` or project settings:

```yaml
rules:
  - path: .cursor/rules/faker-migrations.mdc
    triggers:
      - path: podverse-orm/src/entities/**/*.ts
        action: remind
      - path: podverse-orm/src/db/entities.ts
        action: remind
```

## Entity-to-Generator Quick Reference

### Account Entities

| Entity | Generator File | Notes |
|--------|---------------|-------|
| Account | `account/account.ts` | Core account |
| AccountCredentials | `account/accountCredentials.ts` | Email/password |
| AccountProfile | `account/accountProfile.ts` | Profile info |
| AccountSettings | `account/accountSettings.ts` | User preferences |
| AccountSettingsLocale | `account/accountSettings.ts` | Part of settings |
| AccountSettingsNotification | `account/accountSettings.ts` | Part of settings |
| AccountSettingsNotificationType | `account/accountSettings.ts` | Part of settings |
| AccountMembershipStatus | `account/accountMembership.ts` | Subscription |
| AccountVerification | `account/accountVerification.ts` | Email verification |
| AccountResetPassword | Not generated | Created on-demand |
| AccountEmailChangeVerification | Not generated | Created on-demand |
| AccountFollowingAccount | `account/accountFollowing.ts` | Social |
| AccountFollowingChannel | `account/accountFollowing.ts` | Subscriptions |
| AccountFollowingAddByRSSChannel | **EXCLUDED** | Deferred - see index |
| AccountFollowingPlaylist | `account/accountFollowing.ts` | Playlist follows |
| AccountFCMDevice | `account/accountDevices.ts` | Push devices |
| AccountUPDevice | `account/accountDevices.ts` | UnifiedPush |
| AccountWebPushDevice | `account/accountDevices.ts` | Web push |
| AccountNotificationChannel | `account/accountNotifications.ts` | Per-channel |
| AccountNotificationChannelType | `account/accountNotifications.ts` | Notification types |
| AccountAppStorePurchase | `account/accountPurchases.ts` | iOS purchases |
| AccountGooglePlayPurchase | `account/accountPurchases.ts` | Android purchases |
| AccountPayPalOrder | `account/accountPurchases.ts` | PayPal |

### Feed/Channel Entities

| Entity | Generator File | Notes |
|--------|---------------|-------|
| Feed | `feed/feed.ts` | RSS feed URL |
| FeedLog | `feed/feedLog.ts` | Parse history |
| Channel | `channel/channel.ts` | Podcast/show |
| ChannelAbout | `channel/channelAbout.ts` | Metadata |
| ChannelDescription | `channel/channelDescription.ts` | Description |
| ChannelCategory | `channel/channelCategory.ts` | iTunes categories |
| ChannelChat | `channel/channelAdditional.ts` | Chat integration |
| ChannelFunding | `channel/channelFunding.ts` | Donation links |
| ChannelImage | `channel/channelImage.ts` | Artwork |
| ChannelInternalSettings | `channel/channelAdditional.ts` | Internal flags |
| ChannelLicense | `channel/channelAdditional.ts` | Content license |
| ChannelLocation | `channel/channelAdditional.ts` | Geo location |
| ChannelPerson | `channel/channelPerson.ts` | Cast/crew |
| ChannelPodroll | `channel/channelAdditional.ts` | Recommendations |
| ChannelPodrollRemoteItem | `channel/channelAdditional.ts` | Podroll items |
| ChannelPublisher | `channel/channelAdditional.ts` | Publisher info |
| ChannelPublisherRemoteItem | `channel/channelAdditional.ts` | Publisher items |
| ChannelRemoteItem | `channel/channelAdditional.ts` | Remote items |
| ChannelSeason | `channel/channelSeason.ts` | Season info |
| ChannelSocialInteract | `channel/channelAdditional.ts` | Social links |
| ChannelTrailer | `channel/channelAdditional.ts` | Trailers |
| ChannelTxt | `channel/channelAdditional.ts` | TXT records |
| ChannelValue | `channel/channelValue.ts` | Value4Value |
| ChannelValueRecipient | `channel/channelValue.ts` | Payment splits |

### Item Entities

| Entity | Generator File | Notes |
|--------|---------------|-------|
| Item | `item/item.ts` | Episode |
| ItemAbout | `item/itemAbout.ts` | Metadata |
| ItemDescription | `item/itemDescription.ts` | Show notes |
| ItemChat | `item/itemAdditional.ts` | Chat |
| ItemChapter | `item/itemChapter.ts` | Chapters |
| ItemChapterLocation | `item/itemChapter.ts` | Chapter geo |
| ItemChaptersFeed | `item/itemChapter.ts` | External chapters |
| ItemChaptersFeedLog | `item/itemChapter.ts` | Parse log |
| ItemContentLink | `item/itemAdditional.ts` | Content links |
| ItemEnclosure | `item/itemEnclosure.ts` | Media files |
| ItemEnclosureIntegrity | `item/itemEnclosure.ts` | File hashes |
| ItemEnclosureSource | `item/itemEnclosure.ts` | Alt sources |
| ItemFunding | `item/itemAdditional.ts` | Donations |
| ItemImage | `item/itemImage.ts` | Artwork |
| ItemLicense | `item/itemAdditional.ts` | License |
| ItemLocation | `item/itemAdditional.ts` | Geo |
| ItemPerson | `item/itemPerson.ts` | Guests |
| ItemSeason | `item/itemAdditional.ts` | Season ref |
| ItemSeasonEpisode | `item/itemAdditional.ts` | Episode number |
| ItemSocialInteract | `item/itemAdditional.ts` | Social |
| ItemSoundbite | `item/itemAdditional.ts` | Soundbites |
| ItemTranscript | `item/itemAdditional.ts` | Transcripts |
| ItemTxt | `item/itemAdditional.ts` | TXT |
| ItemValue | `item/itemValue.ts` | Value4Value |
| ItemValueRecipient | `item/itemValue.ts` | Recipients |
| ItemValueTimeSplit | `item/itemValue.ts` | Time splits |
| ItemValueTimeSplitRecipient | `item/itemValue.ts` | Split recipients |
| ItemValueTimeSplitRemoteItem | `item/itemValue.ts` | Remote items |
| LiveItem | `item/liveItem.ts` | Livestreams |

### User Content Entities

| Entity | Generator File | Notes |
|--------|---------------|-------|
| Clip | `userContent/clip.ts` | User clips |
| Playlist | `userContent/playlist.ts` | Playlists |
| PlaylistResource | `userContent/playlistResource.ts` | Playlist items |
| Queue | `userContent/queue.ts` | Play queue |
| QueueResource | `userContent/queueResource.ts` | Queue items |

### Stats Entities

| Entity | Generator File | Notes |
|--------|---------------|-------|
| StatsAggregatedAccount | `stats/statsAggregated.ts` | Account stats |
| StatsAggregatedChannel | `stats/statsAggregated.ts` | Channel stats |
| StatsAggregatedClip | `stats/statsAggregated.ts` | Clip stats |
| StatsAggregatedItem | `stats/statsAggregated.ts` | Item stats |
| StatsAggregatedPlaylist | `stats/statsAggregated.ts` | Playlist stats |
| StatsTrackAccountGuid | `stats/statsTrackEvent.ts` | Tracking IDs |
| StatsTrackEventAccount | `stats/statsTrackEvent.ts` | Account events |
| StatsTrackEventChannel | `stats/statsTrackEvent.ts` | Channel events |
| StatsTrackEventClip | `stats/statsTrackEvent.ts` | Clip events |
| StatsTrackEventItem | `stats/statsTrackEvent.ts` | Item events |
| StatsTrackEventPlaylist | `stats/statsTrackEvent.ts` | Playlist events |

### Miscellaneous Entities

| Entity | Generator File | Notes |
|--------|---------------|-------|
| MembershipClaimToken | `misc/membershipClaimToken.ts` | Gift tokens |
| OnDemandParserEvent | `misc/onDemandParserEvent.ts` | Parser requests |

### Lookup Tables (NOT Generated)

| Entity | Notes |
|--------|-------|
| SharableStatus | 3 fixed rows |
| AccountMembership | 2 fixed rows |
| FeedFlagStatus | 6 fixed rows |
| ItemFlagStatus | 4 fixed rows |
| LiveItemStatus | 3 fixed rows |
| ChannelItunesType | 2 fixed rows |
| ItemItunesEpisodeType | 3 fixed rows |
| Medium | 29 fixed rows |
| Category | 105 fixed rows |

## Testing Guidelines

### Unit Tests for Generators

```typescript
// Example test structure
describe('AccountGenerator', () => {
  it('should generate special accounts with correct config', () => {
    const generator = new AccountGenerator();
    const specialAccounts = generator.generateSpecialAccounts();
    
    expect(specialAccounts).toHaveLength(4);
    expect(specialAccounts[0].isSpecial).toBe(true);
    expect(specialAccounts[0].verified).toBe(true);
  });
  
  it('should generate random accounts with valid fields', () => {
    const generator = new AccountGenerator();
    const accounts = generator.generateRandomAccounts(10);
    
    expect(accounts).toHaveLength(10);
    accounts.forEach(account => {
      expect(account.id_text).toBeDefined();
      expect(account.sharable_status_id).toBeGreaterThanOrEqual(1);
      expect(account.sharable_status_id).toBeLessThanOrEqual(3);
    });
  });
});
```

### Integration Tests

```typescript
describe('Full Generation Pipeline', () => {
  it('should generate valid data for baseCount=10', async () => {
    const result = await generateFakeData({ baseCount: 10 });
    
    // Verify counts
    expect(result.accounts.length).toBe(14); // 4 special + 10 random
    expect(result.feeds.length).toBe(10);
    expect(result.channels.length).toBe(10);
    expect(result.items.length).toBe(20); // 2 per channel
    
    // Verify relationships
    result.channels.forEach(channel => {
      const feed = result.feeds.find(f => f.id === channel.feed_id);
      expect(feed).toBeDefined();
    });
    
    result.items.forEach(item => {
      const channel = result.channels.find(c => c.id === item.channel_id);
      expect(channel).toBeDefined();
    });
  });
});
```

### Validation Tests

```typescript
describe('Data Validation', () => {
  it('should respect DATABASE_CONSTANTS string lengths', () => {
    const generator = new ChannelGenerator();
    const feeds = new FeedGenerator().generateMany(100);
    
    feeds.forEach(feed => {
      const channel = generator.generate(feed);
      
      if (channel.title) {
        expect(channel.title.length).toBeLessThanOrEqual(DATABASE_CONSTANTS.varchar_normal);
      }
      if (channel.slug) {
        expect(channel.slug.length).toBeLessThanOrEqual(DATABASE_CONSTANTS.varchar_slug);
      }
    });
  });
  
  it('should generate valid URLs pointing to media server', () => {
    const generator = new ItemImageGenerator();
    const item = { id: 1, id_text: 'test123' } as GeneratedItem;
    const images = generator.generate(item, 2);
    
    images.forEach(image => {
      expect(image.url).toMatch(/^http:\/\/localhost:2111\/images\//);
    });
  });
});
```

## Migration Checklist Template

When creating a new migration that affects entities, use this checklist:

```markdown
## Migration: [Migration Name]

### Entity Changes
- [ ] New entity: `EntityName`
- [ ] Modified entity: `EntityName`
- [ ] Deleted entity: `EntityName`

### Faker Updates Required
- [ ] Create generator: `podverse-qa/src/faker/generators/[category]/[entity].ts`
- [ ] Update exports: `podverse-qa/src/faker/generators/[category]/index.ts`
- [ ] Update orchestrator
- [ ] Update documentation

### Testing
- [ ] Unit tests for new generator
- [ ] Integration test passes
- [ ] Manual verification with `npm run faker -- --baseCount 10`

### Documentation
- [ ] Updated `docs/faker/[relevant-doc].md`
- [ ] Updated entity mapping table in `08-llm-skills.md`
```

## Common Patterns

### Handling New Enum Values

When a new enum value is added to `podverse-helpers`:

1. Update the relevant `LookupTables` utility in `podverse-qa/src/faker/utils/lookupTables.ts`
2. Update any weighted random selections that use the enum
3. Ensure the database seed includes the new value

### Handling New Relationships

When adding a new relationship (e.g., `Channel` now has `ChannelNewFeature`):

1. Create a generator for the new entity
2. Add to the channel generation orchestrator
3. Ensure generation order respects foreign key constraints
4. Update the count estimates in documentation

### Handling Column Type Changes

When changing a column type (e.g., `varchar(50)` to `varchar(255)`):

1. Update any string slicing in the generator to use the new limit
2. Verify existing test data is still valid
3. Consider if generated data patterns should change

## Troubleshooting

### Common Issues

1. **Foreign key constraint violation**
   - Ensure entities are generated in correct order
   - Verify referenced entity exists before creating dependent

2. **String too long**
   - Always use `.slice(0, DATABASE_CONSTANTS.varchar_*)` for string fields
   - Check that faker-generated content is truncated

3. **Invalid enum value**
   - Use `LookupTables` helper instead of raw numbers
   - Verify enum values match database seed data

4. **Duplicate unique constraint**
   - Use `generateRandomIdText()` for id_text fields
   - Ensure email uniqueness with counter or timestamp suffix
