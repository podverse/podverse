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

      const finalResult = await buildRemoteItemsFinalResult(
        result.podrollChannelsAdded as unknown as DTOChannel[],
        result.podrollChannelsUnadded,
        result.podrollItemsAdded as unknown as DTOItem[],
        result.podrollItemsUnadded
      );

      res.json(finalResult);
    });
  }
}
