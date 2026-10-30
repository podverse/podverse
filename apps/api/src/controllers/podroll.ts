import { getParamRequired } from '@api/lib/params.js';
import { buildRemoteItemsFinalResult } from '@api/lib/remoteItems.js';
import { idOrIdTextParamSchema, validateParamsObject } from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import type { DTOChannel, DTOItem } from '@podverse/helpers';
import { ChannelPodrollService } from '@podverse/orm';

export class PodrollController {
  private static channelPodrollService = new ChannelPodrollService();

  static async getPodrollForChannel(req: Request, res: Response): Promise<void> {
    validateParamsObject(Joi.object(idOrIdTextParamSchema), req, res, async () => {
      const idOrIdText = getParamRequired(req, 'idOrIdText');
      const result = await PodrollController.channelPodrollService.getPodrollForChannel(idOrIdText);

      // Channel and Item entities are serialized as the shared channel and item DTOs.
      const finalResult = await buildRemoteItemsFinalResult({
        channelsAdded: result.podrollChannelsAdded as unknown as DTOChannel[],
        channelRefsUnmatched: result.podrollChannelsUnadded,
        itemsAdded: result.podrollItemsAdded as unknown as DTOItem[],
        itemRefsUnmatched: result.podrollItemsUnadded,
      });

      res.json(finalResult);
    });
  }
}
