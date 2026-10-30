import { getParamRequired } from '@api/lib/params.js';
import { buildRemoteItemsFinalResult } from '@api/lib/remoteItems.js';
import { idOrIdTextParamSchema, validateParamsObject } from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import type { DTOChannel, DTOItem } from '@podverse/helpers';
import { ChannelService, RemoteItemReferenceService } from '@podverse/orm';

export class RemoteItemController {
  private static channelService = new ChannelService();
  private static remoteItemReferenceService = new RemoteItemReferenceService();

  static async getRemoteItemsForChannel(req: Request, res: Response): Promise<void> {
    validateParamsObject(Joi.object(idOrIdTextParamSchema), req, res, async () => {
      const idOrIdText = getParamRequired(req, 'idOrIdText');
      const channel = await RemoteItemController.channelService.getByIdOrIdText(idOrIdText, {
        channel_remote_items: true,
      });
      const refs = [...(channel?.channel_remote_items ?? [])].sort(
        (left, right) => left.id - right.id
      );
      const partitioned = await RemoteItemController.remoteItemReferenceService.partition(refs);

      // Channel and Item entities are serialized as the shared channel and item DTOs.
      const finalResult = await buildRemoteItemsFinalResult({
        channelsAdded: partitioned.channelsAdded as unknown as DTOChannel[],
        channelRefsUnmatched: partitioned.channelRefsUnmatched,
        itemsAdded: partitioned.itemsAdded as unknown as DTOItem[],
        itemRefsUnmatched: partitioned.itemRefsUnmatched,
      });

      res.json(finalResult);
    });
  }
}
