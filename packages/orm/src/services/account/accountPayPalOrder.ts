// Legacy PayPal order routes construct this service.
export class AccountPayPalOrderService {
  async get(accountId: number, paymentId: string): Promise<never> {
    throw new Error(
      `PayPal order storage is unavailable for account ${accountId} payment ${paymentId}.`
    );
  }

  async create(accountId: number, paymentId: string, state: string): Promise<never> {
    throw new Error(
      `PayPal order storage is unavailable for account ${accountId} payment ${paymentId} (${state}).`
    );
  }

  async completePayPalOrder(paymentId: string, state: string, isV2: boolean): Promise<never> {
    throw new Error(
      `PayPal order storage is unavailable for payment ${paymentId} (${state}, v2=${isV2}).`
    );
  }
}
