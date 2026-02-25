import { PayPalService } from '@podverse/external-services-paypal';
import { config } from '@api/config/index.js';

export const paypalService = new PayPalService({
  clientId: config.paypal.clientId,
  clientSecret: config.paypal.clientSecret,
  nodeEnv: config.nodeEnv,
});
