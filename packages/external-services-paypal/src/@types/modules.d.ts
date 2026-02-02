declare module "paypal-rest-sdk" {
  interface PaymentsNamespace {
    PaymentGetRequest: new (paymentId: string) => unknown;
    CaptureGetRequest: new (captureId: string) => unknown;
  }
  const paypal: {
    v1: { payments: PaymentsNamespace };
    core: {
      PayPalHttpClient: new (env: unknown) => { execute: (req: unknown) => Promise<unknown> };
      LiveEnvironment: new (clientId: string, clientSecret: string) => unknown;
      SandboxEnvironment: new (clientId: string, clientSecret: string) => unknown;
    };
  };
  export default paypal;
}
