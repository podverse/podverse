import { getDataSourceRead, getDataSourceReadWrite } from '@orm/context.js';
import { EmbedDemoShowcase } from '@orm/entities/embedDemoShowcase.js';
import { ChannelService } from '@orm/services/channel/channel.js';
import { ClipService } from '@orm/services/clip.js';
import { ItemService } from '@orm/services/item/item.js';
import { ItemChapterService } from '@orm/services/item/itemChapter.js';
import { ItemSoundbiteService } from '@orm/services/item/itemSoundbite.js';
import { PlaylistService } from '@orm/services/playlist/playlist.js';
import type { DataSource } from 'typeorm';

import type {
  EmbedDemoShowcaseAdminSlot,
  EmbedDemoShowcaseApiEntry,
  EmbedDemoShowcaseId,
  EmbedDemoShowcaseRouteKind,
} from '@podverse/helpers';
import {
  buildEmbedDemoHref,
  EMBED_DEMO_SHOWCASE_SLOT_DEFS,
  getEmbedDemoShowcaseSlotDef,
  isEmbedDemoShowcaseId,
  MediumEnum,
  SharableStatusEnum,
} from '@podverse/helpers';

export class EmbedDemoConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmbedDemoConfigValidationError';
  }
}

export class EmbedDemoConfigService {
  private dataSourceRead: DataSource;
  private dataSourceReadWrite: DataSource;
  private itemServiceInstance: ItemService | undefined;
  private channelServiceInstance: ChannelService | undefined;
  private clipServiceInstance: ClipService | undefined;
  private itemChapterServiceInstance: ItemChapterService | undefined;
  private itemSoundbiteServiceInstance: ItemSoundbiteService | undefined;
  private playlistServiceInstance: PlaylistService | undefined;

  constructor(params?: { dataSourceRead?: DataSource; dataSourceReadWrite?: DataSource }) {
    this.dataSourceRead = params?.dataSourceRead ?? getDataSourceRead();
    this.dataSourceReadWrite = params?.dataSourceReadWrite ?? getDataSourceReadWrite();
  }

  private getItemService(): ItemService {
    if (this.itemServiceInstance === undefined) {
      this.itemServiceInstance = new ItemService();
    }

    return this.itemServiceInstance;
  }

  private getChannelService(): ChannelService {
    if (this.channelServiceInstance === undefined) {
      this.channelServiceInstance = new ChannelService();
    }

    return this.channelServiceInstance;
  }

  private getClipService(): ClipService {
    if (this.clipServiceInstance === undefined) {
      this.clipServiceInstance = new ClipService();
    }

    return this.clipServiceInstance;
  }

  private getItemChapterService(): ItemChapterService {
    if (this.itemChapterServiceInstance === undefined) {
      this.itemChapterServiceInstance = new ItemChapterService();
    }

    return this.itemChapterServiceInstance;
  }

  private getItemSoundbiteService(): ItemSoundbiteService {
    if (this.itemSoundbiteServiceInstance === undefined) {
      this.itemSoundbiteServiceInstance = new ItemSoundbiteService();
    }

    return this.itemSoundbiteServiceInstance;
  }

  private getPlaylistService(): PlaylistService {
    if (this.playlistServiceInstance === undefined) {
      this.playlistServiceInstance = new PlaylistService();
    }

    return this.playlistServiceInstance;
  }

  async getConfiguredShowcases(): Promise<EmbedDemoShowcaseApiEntry[]> {
    const rows = await this.dataSourceRead.getRepository(EmbedDemoShowcase).find({
      order: { showcase_id: 'ASC' },
    });

    const resolved: EmbedDemoShowcaseApiEntry[] = [];

    for (const row of rows) {
      if (!isEmbedDemoShowcaseId(row.showcase_id)) {
        continue;
      }

      const slot = getEmbedDemoShowcaseSlotDef(row.showcase_id);
      const note = await this.resolveResourceNote(slot.routeKind, row.resource_id_text);

      resolved.push({
        showcaseId: row.showcase_id,
        routeKind: slot.routeKind,
        resourceIdText: row.resource_id_text,
        href: buildEmbedDemoHref(slot.routeKind, row.resource_id_text, row.showcase_id),
        note,
      });
    }

    return resolved;
  }

  async getAdminShowcaseSlots(): Promise<EmbedDemoShowcaseAdminSlot[]> {
    const rows = await this.dataSourceRead.getRepository(EmbedDemoShowcase).find();
    const configuredById = new Map(rows.map((row) => [row.showcase_id, row.resource_id_text]));

    return EMBED_DEMO_SHOWCASE_SLOT_DEFS.map((slot) => ({
      showcaseId: slot.showcaseId,
      routeKind: slot.routeKind,
      resourceIdText: configuredById.get(slot.showcaseId) ?? null,
    }));
  }

  async upsertShowcase(showcaseId: string, resourceIdText: string): Promise<EmbedDemoShowcase> {
    if (!isEmbedDemoShowcaseId(showcaseId)) {
      throw new EmbedDemoConfigValidationError(`Unknown showcase id: ${showcaseId}`);
    }

    const trimmedIdText = resourceIdText.trim();
    if (trimmedIdText === '') {
      throw new EmbedDemoConfigValidationError('Resource id_text is required.');
    }

    const slot = getEmbedDemoShowcaseSlotDef(showcaseId);
    await this.validateResourceForSlot(showcaseId, slot.routeKind, trimmedIdText);

    const repo = this.dataSourceReadWrite.getRepository(EmbedDemoShowcase);
    const existing = await repo.findOne({ where: { showcase_id: showcaseId } });

    if (existing !== null) {
      existing.resource_id_text = trimmedIdText;
      return repo.save(existing);
    }

    const created = repo.create({
      showcase_id: showcaseId,
      resource_id_text: trimmedIdText,
    });
    return repo.save(created);
  }

  async deleteShowcase(showcaseId: string): Promise<boolean> {
    if (!isEmbedDemoShowcaseId(showcaseId)) {
      throw new EmbedDemoConfigValidationError(`Unknown showcase id: ${showcaseId}`);
    }

    const result = await this.dataSourceReadWrite
      .getRepository(EmbedDemoShowcase)
      .delete({ showcase_id: showcaseId });

    return (result.affected ?? 0) > 0;
  }

  private async validateResourceForSlot(
    showcaseId: EmbedDemoShowcaseId,
    routeKind: EmbedDemoShowcaseRouteKind,
    resourceIdText: string
  ): Promise<void> {
    switch (routeKind) {
      case 'episode':
      case 'track':
        await this.validateItemForShowcase(showcaseId, routeKind, resourceIdText);
        return;
      case 'clip':
        await this.validateClip(resourceIdText);
        return;
      case 'official-clip':
        await this.validateSoundbite(resourceIdText);
        return;
      case 'chapter':
        await this.validateChapter(resourceIdText);
        return;
      case 'podcast':
        await this.validatePodcastChannel(showcaseId, resourceIdText);
        return;
      case 'album':
        await this.validateAlbumChannel(resourceIdText);
        return;
      case 'playlist':
        await this.validatePlaylist(resourceIdText);
        return;
      default: {
        const exhaustive: never = routeKind;
        throw new EmbedDemoConfigValidationError(`Unsupported route kind: ${String(exhaustive)}`);
      }
    }
  }

  private async validateItemForShowcase(
    showcaseId: EmbedDemoShowcaseId,
    routeKind: 'episode' | 'track',
    resourceIdText: string
  ): Promise<void> {
    const item = await this.getItemService().getByIdText(resourceIdText, {
      channel: { feed: { feed_policy: true } },
    });

    if (item === null) {
      throw new EmbedDemoConfigValidationError(`Item not found: ${resourceIdText}`);
    }

    const channel = item.channel;
    if (channel === null || channel === undefined) {
      throw new EmbedDemoConfigValidationError(`Item channel not found: ${resourceIdText}`);
    }

    if (channel.feed?.feed_policy?.public_visible === false) {
      throw new EmbedDemoConfigValidationError(
        `Item channel is not publicly visible: ${resourceIdText}`
      );
    }

    const mediumId = channel.medium_id;
    const isMusic = mediumId === MediumEnum.Music || mediumId === MediumEnum.MusicL;
    const isAv =
      mediumId === MediumEnum.AV ||
      mediumId === MediumEnum.Podcast ||
      mediumId === MediumEnum.Video ||
      mediumId === MediumEnum.PodcastL ||
      mediumId === MediumEnum.VideoL;

    if (routeKind === 'track' && !isMusic) {
      throw new EmbedDemoConfigValidationError(
        `Track showcase requires a music item; got medium_id ${String(mediumId)} for ${resourceIdText}`
      );
    }

    if (routeKind === 'episode' && isMusic) {
      throw new EmbedDemoConfigValidationError(
        `Episode showcase requires a podcast or AV item; ${resourceIdText} is music`
      );
    }

    if (routeKind === 'episode' && !isAv && !isMusic) {
      throw new EmbedDemoConfigValidationError(
        `Episode showcase requires a podcast or AV item; got medium_id ${String(mediumId)} for ${resourceIdText}`
      );
    }

    if (
      showcaseId.endsWith('-video') &&
      mediumId !== MediumEnum.Video &&
      mediumId !== MediumEnum.VideoL
    ) {
      // AV/podcast channels may host video episodes; allow AV/Podcast/Video mediums for video slots.
      if (!isAv && !isMusic) {
        throw new EmbedDemoConfigValidationError(
          `Video showcase requires video-capable content for ${resourceIdText}`
        );
      }
    }
  }

  private async validateClip(resourceIdText: string): Promise<void> {
    const clip = await this.getClipService().getByIdText(resourceIdText, {
      relations: { item: { channel: { feed: { feed_policy: true } } } },
    });

    if (clip === null) {
      throw new EmbedDemoConfigValidationError(`Clip not found: ${resourceIdText}`);
    }

    if (clip.item?.channel?.feed?.feed_policy?.public_visible === false) {
      throw new EmbedDemoConfigValidationError(
        `Clip parent channel is not publicly visible: ${resourceIdText}`
      );
    }
  }

  private async validateSoundbite(resourceIdText: string): Promise<void> {
    const soundbite = await this.getItemSoundbiteService().getByIdText(resourceIdText, {
      relations: { item: { channel: { feed: { feed_policy: true } } } },
    });

    if (soundbite === null) {
      throw new EmbedDemoConfigValidationError(`Official clip not found: ${resourceIdText}`);
    }

    if (soundbite.item?.channel?.feed?.feed_policy?.public_visible === false) {
      throw new EmbedDemoConfigValidationError(
        `Official clip parent channel is not publicly visible: ${resourceIdText}`
      );
    }
  }

  private async validateChapter(resourceIdText: string): Promise<void> {
    const chapter = await this.getItemChapterService().getByIdText(resourceIdText);

    if (chapter === null) {
      throw new EmbedDemoConfigValidationError(`Chapter not found: ${resourceIdText}`);
    }
  }

  private async validatePodcastChannel(
    showcaseId: EmbedDemoShowcaseId,
    resourceIdText: string
  ): Promise<void> {
    const channel = await this.getChannelService().getByIdText(resourceIdText, {
      feed: { feed_policy: true },
    });

    if (channel === null) {
      throw new EmbedDemoConfigValidationError(`Podcast channel not found: ${resourceIdText}`);
    }

    if (channel.feed?.feed_policy?.public_visible === false) {
      throw new EmbedDemoConfigValidationError(
        `Podcast channel is not publicly visible: ${resourceIdText}`
      );
    }

    const mediumId = channel.medium_id;
    const isPodcastLike =
      mediumId === MediumEnum.AV ||
      mediumId === MediumEnum.Podcast ||
      mediumId === MediumEnum.Video ||
      mediumId === MediumEnum.PodcastL ||
      mediumId === MediumEnum.VideoL;

    if (!isPodcastLike) {
      throw new EmbedDemoConfigValidationError(
        `Podcast showcase requires a podcast or AV channel; got medium_id ${String(mediumId)}`
      );
    }

    if (
      showcaseId === 'podcast-video' &&
      mediumId !== MediumEnum.Video &&
      mediumId !== MediumEnum.VideoL
    ) {
      // Video podcast channels may still use AV medium in fixtures; allow AV + Video.
      if (mediumId !== MediumEnum.AV) {
        throw new EmbedDemoConfigValidationError(
          `Podcast video showcase requires a video or AV channel: ${resourceIdText}`
        );
      }
    }
  }

  private async validateAlbumChannel(resourceIdText: string): Promise<void> {
    const channel = await this.getChannelService().getByIdText(resourceIdText, {
      feed: { feed_policy: true },
    });

    if (channel === null) {
      throw new EmbedDemoConfigValidationError(`Album channel not found: ${resourceIdText}`);
    }

    if (channel.feed?.feed_policy?.public_visible === false) {
      throw new EmbedDemoConfigValidationError(
        `Album channel is not publicly visible: ${resourceIdText}`
      );
    }

    const mediumId = channel.medium_id;
    if (mediumId !== MediumEnum.Music && mediumId !== MediumEnum.MusicL) {
      throw new EmbedDemoConfigValidationError(
        `Album showcase requires a music channel; got medium_id ${String(mediumId)}`
      );
    }
  }

  private async validatePlaylist(resourceIdText: string): Promise<void> {
    const playlist = await this.getPlaylistService().getByIdText(resourceIdText);

    if (playlist === null) {
      throw new EmbedDemoConfigValidationError(`Playlist not found: ${resourceIdText}`);
    }

    if (playlist.sharable_status_id !== SharableStatusEnum.Public) {
      throw new EmbedDemoConfigValidationError(
        `Playlist showcase requires a public playlist: ${resourceIdText}`
      );
    }
  }

  private async resolveResourceNote(
    routeKind: EmbedDemoShowcaseRouteKind,
    resourceIdText: string
  ): Promise<string | null> {
    switch (routeKind) {
      case 'episode':
      case 'track': {
        const item = await this.getItemService().getByIdText(resourceIdText);
        return item?.title ?? null;
      }
      case 'clip': {
        const clip = await this.getClipService().getByIdText(resourceIdText);
        return clip?.title ?? clip?.item?.title ?? null;
      }
      case 'official-clip': {
        const soundbite = await this.getItemSoundbiteService().getByIdText(resourceIdText);
        return soundbite?.title ?? soundbite?.item?.title ?? null;
      }
      case 'chapter': {
        const chapter = await this.getItemChapterService().getByIdText(resourceIdText);
        return chapter?.title ?? null;
      }
      case 'podcast':
      case 'album': {
        const channel = await this.getChannelService().getByIdText(resourceIdText);
        return channel?.title ?? null;
      }
      case 'playlist': {
        const playlist = await this.getPlaylistService().getByIdText(resourceIdText);
        return playlist?.title ?? null;
      }
      default: {
        const exhaustive: never = routeKind;
        throw new Error(`Unsupported route kind: ${String(exhaustive)}`);
      }
    }
  }
}
