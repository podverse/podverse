import paypalRestSdk from 'paypal-rest-sdk';

const payments = paypalRestSdk.v1.payments;

export interface PayPalServiceParams {
  clientId: string;
  clientSecret: string;
  nodeEnv?: string; // 'production' or other
}

export class PayPalService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any;
  private clientId: string;
  private clientSecret: string;
  private nodeEnv: string;

  constructor({ clientId, clientSecret, nodeEnv = 'development' }: PayPalServiceParams) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.nodeEnv = nodeEnv;
    this.client = new paypalRestSdk.core.PayPalHttpClient(this.getEnvironment());
  }

  private getEnvironment() {
    if (this.nodeEnv === 'production') {
      return new paypalRestSdk.core.LiveEnvironment(this.clientId, this.clientSecret);
    } else {
      return new paypalRestSdk.core.SandboxEnvironment(this.clientId, this.clientSecret);
    }
  }

  async getPaymentInfo(paymentId: string) {
    const request = new payments.PaymentGetRequest(paymentId);
    const response = await this.client.execute(request);
    return response?.data?.result;
  }

  async getCaptureInfo(paymentId: string) {
    const request = new payments.CaptureGetRequest(paymentId);
    const response = await this.client.execute(request);
    return response?.data?.result;
  }
}
