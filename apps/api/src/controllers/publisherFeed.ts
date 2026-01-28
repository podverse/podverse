import { Request, Response } from 'express';
import Joi from 'joi';
import { PublisherFeedService } from '@podverse/orm';
import { DTOChannel, DTOItem } from '@podverse/helpers';
import { validateParamsObject } from '@api/lib/validation';
import { buildRemoteItemsFinalResult } from '@api/lib/remoteItems';
import { getParamRequired } from '@api/lib/params';

const getPublisherFeedRemoteItemsForChannelSchema = Joi.object({
  idOrIdText: Joi.string().required(),
});

export class PublisherFeedController {
  private static publisherFeedService = new PublisherFeedService();

  static async getPublisherFeedRemoteItemsForChannel(req: Request, res: Response): Promise<void> {
    validateParamsObject(getPublisherFeedRemoteItemsForChannelSchema, req, res, async () => {
      const idOrIdText = getParamRequired(req, 'idOrIdText');

      const result =
        await PublisherFeedController.publisherFeedService.getPublisherFeedRemoteItemsForChannel(
          idOrIdText
        );

      const finalRemoteItemsResult = await buildRemoteItemsFinalResult(
        result.publisherChannelsAdded as unknown as DTOChannel[],
        result.publisherChannelsUnadded,
        result.publisherItemsAdded as unknown as DTOItem[],
        result.publisherItemsUnadded
      );

      const finalResult = {
        channel: result.channel,
        ...finalRemoteItemsResult,
      };

      res.json(finalResult);
    });
  }
}
