import { Request, Response } from 'express';
import Joi from 'joi';
import { ChannelPodrollService } from '@podverse/orm';
import { DTOChannel, DTOItem } from '@podverse/helpers';
import { idOrIdTextParamSchema, validateParamsObject } from '@api/lib/validation';
import { buildRemoteItemsFinalResult } from '@api/lib/remoteItems';
import { getParamRequired } from '@api/lib/params';

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
