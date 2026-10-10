import type { BillingAdapterRegistry, TestPaymentProcessorAdapter } from '@podverse/billing';
import { createTestAdapter, isTestAdapterAllowed } from '@podverse/billing';
import { createAppleAdapter } from '@podverse/external-services-apple-app-store';
import { createGooglePlayAdapter } from '@podverse/external-services-google-play';
import { createPayPalAdapter, PayPalService } from '@podverse/external-services-paypal';
import type { BillingProcessorEnv } from '@podverse/helpers-config';

export interface BillingAdaptersConfig {
  nodeEnv: string;
  allowTestAdapter: boolean;
  processors: BillingProcessorEnv;
}

export interface RegisteredBillingAdapters {
  /** Shared with the PayPal adapter; checkout routes create and capture orders through it. */
  paypalService: PayPalService | null;
  /** Null in production unless the test adapter is explicitly allowed. */
  testAdapter: TestPaymentProcessorAdapter | null;
}

/**
 * Registers an adapter for each processor this deployment has enabled. A processor that is not
 * enabled (flag off or credentials missing) is left out, which removes it from checkout options
 * and 404s its webhook.
 */
export function registerBillingAdapters(
  registry: BillingAdapterRegistry,
  config: BillingAdaptersConfig
): RegisteredBillingAdapters {
  let testAdapter: TestPaymentProcessorAdapter | null = null;
  if (isTestAdapterAllowed(config)) {
    testAdapter = createTestAdapter({
      nodeEnv: config.nodeEnv,
      allowTestAdapter: config.allowTestAdapter,
    });
    registry.register(testAdapter);
  }

  let paypalService: PayPalService | null = null;
  const paypal = config.processors.paypal;
  if (paypal !== null) {
    paypalService = new PayPalService({
      clientId: paypal.clientId,
      clientSecret: paypal.clientSecret,
      paypalEnvironment: paypal.environment,
      nodeEnv: config.nodeEnv,
      webhookId: paypal.webhookId,
    });
    registry.register(
      createPayPalAdapter({
        clientId: paypal.clientId,
        clientSecret: paypal.clientSecret,
        paypalEnvironment: paypal.environment,
        nodeEnv: config.nodeEnv,
        webhookId: paypal.webhookId,
        service: paypalService,
      })
    );
  }

  const apple = config.processors.apple;
  if (apple !== null) {
    registry.register(
      createAppleAdapter({
        issuerId: apple.issuerId,
        keyId: apple.keyId,
        privateKeyPath: apple.privateKeyPath,
        bundleId: apple.bundleId,
        appAppleId: apple.appAppleId,
        appleEnvironment: apple.environment,
        nodeEnv: config.nodeEnv,
      })
    );
  }

  const googlePlay = config.processors.googlePlay;
  if (googlePlay !== null) {
    registry.register(
      createGooglePlayAdapter({
        packageName: googlePlay.packageName,
        serviceAccountJsonPath: googlePlay.serviceAccountJsonPath,
        rtdnPushAudience: googlePlay.rtdnPushAudience,
        rtdnPushServiceAccountEmail: googlePlay.rtdnPushServiceAccountEmail,
      })
    );
  }

  return { paypalService, testAdapter };
}
