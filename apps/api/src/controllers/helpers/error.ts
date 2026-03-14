/* eslint-disable @typescript-eslint/no-explicit-any */
import { config } from '@api/config/index.js';
import { loggerService } from '@api/factories/loggerService.js';
import type { Response } from 'express';

export function handleGenericErrorResponse(res: Response, error: any) {
  // TODO: how to handle logging of unknown server errors?
  if (config.nodeEnv !== 'production') {
    loggerService.logError('Internal server error', error as Error);
  }

  // Don't attempt to send response if headers already sent
  if (!res.headersSent) {
    // res.status(500).json({ error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
    res.status(500).json({ message: error.message });
  }
}
