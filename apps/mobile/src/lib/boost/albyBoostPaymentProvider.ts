import type { BoostPaymentProvider } from '@podverse/v4v-btc-ln';

import type { AlbyKeysendPayment } from '../../v4v/alby';
import { payAlbyInvoice, sendAlbyKeysends } from '../../v4v/alby';

export function createAlbyBoostPaymentProvider(): BoostPaymentProvider {
  return {
    payInvoice: async (invoice: string) => {
      await payAlbyInvoice(invoice);
    },
    keysend: async (payment) => {
      const keysend: AlbyKeysendPayment = {
        amountSats: payment.amountSats,
        destination: payment.destination,
        customRecords: payment.customRecords ?? {},
      };
      const results = await sendAlbyKeysends([keysend]);
      const result = results[0];
      if (result === undefined || result.errorMessage === 'unexpected_result') {
        throw new Error('Alby keysend returned no result.');
      }
      if (result.errorMessage !== null && result.errorMessage.trim() !== '') {
        throw new Error(result.errorMessage);
      }
    },
  };
}
