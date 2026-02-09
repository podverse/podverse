import { Client, Environment, PaymentsController } from '@paypal/paypal-server-sdk';

export interface PayPalServiceParams {
  clientId: string;
  clientSecret: string;
  nodeEnv?: string; // 'production' or other
}

export class PayPalService {
  private client: Client;
  private paymentsController: PaymentsController;
  private clientId: string;
  private clientSecret: string;
  private nodeEnv: string;

  constructor({ clientId, clientSecret, nodeEnv = 'development' }: PayPalServiceParams) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.nodeEnv = nodeEnv;
    this.client = new Client({
      clientCredentialsAuthCredentials: {
        oAuthClientId: this.clientId,
        oAuthClientSecret: this.clientSecret,
      },
      environment: this.getEnvironment(),
      timeout: 0,
    });
    this.paymentsController = new PaymentsController(this.client);
  }

  private getEnvironment(): Environment {
    return this.nodeEnv === 'production' ? Environment.Production : Environment.Sandbox;
  }

  async getPaymentInfo(paymentId: string) {
    const response = await this.paymentsController.getAuthorizedPayment({
      authorizationId: paymentId,
    });
    return response?.result ?? null;
  }

  async getCaptureInfo(paymentId: string) {
    const response = await this.paymentsController.getCapturedPayment({
      captureId: paymentId,
    });
    return response?.result ?? null;
  }
}
