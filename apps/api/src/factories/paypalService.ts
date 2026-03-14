import { config } from '@api/config/index.js';

import { PayPalService } from '@podverse/external-services-paypal';

export const paypalService = new PayPalService({
  clientId: config.paypal.clientId,
  clientSecret: config.paypal.clientSecret,
  nodeEnv: config.nodeEnv,
});
