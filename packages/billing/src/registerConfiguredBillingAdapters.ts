import { createAppleAdapter } from '@podverse/external-services-apple-app-store';
import type { GooglePlayClient } from '@podverse/external-services-google-play';
import {
  createGooglePlayAdapter,
  PlayDeveloperClient,
} from '@podverse/external-services-google-play';
import { createPayPalAdapter } from '@podverse/external-services-paypal';
import type { BillingProcessorEnv } from '@podverse/helpers-config';

import { createTestAdapter, isTestAdapterAllowed } from './adapters/testAdapter.js';
import type { BillingAdapterRegistry } from './BillingAdapterRegistry.js';

export interface ConfiguredBillingAdapters {
  nodeEnv: string;
  allowTestAdapter: boolean;
  processors: BillingProcessorEnv;
}

export interface RegisteredBillingAdapters {
  /** Shared with the Google Play adapter; reconciliation polls voided purchases through it. */
  googlePlayClient: GooglePlayClient | null;
}

/**
 * Registers an adapter for each processor this deployment holds credentials for. The API,
 * workers, and management API register the same set, so checkout, reconciliation, and the admin
 * resync all read the same processors.
 */
export function registerConfiguredBillingAdapters(
  registry: BillingAdapterRegistry,
  config: ConfiguredBillingAdapters
): RegisteredBillingAdapters {
  if (isTestAdapterAllowed(config)) {
    registry.register(
      createTestAdapter({ nodeEnv: config.nodeEnv, allowTestAdapter: config.allowTestAdapter })
    );
  }

  const paypal = config.processors.paypal;
  if (paypal !== null) {
    registry.register(
      createPayPalAdapter({
        clientId: paypal.clientId,
        clientSecret: paypal.clientSecret,
        paypalEnvironment: paypal.environment,
        nodeEnv: config.nodeEnv,
        webhookId: paypal.webhookId,
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

  let googlePlayClient: GooglePlayClient | null = null;
  const googlePlay = config.processors.googlePlay;
  if (googlePlay !== null) {
    googlePlayClient = new PlayDeveloperClient({
      packageName: googlePlay.packageName,
      serviceAccountJsonPath: googlePlay.serviceAccountJsonPath,
    });
    registry.register(
      createGooglePlayAdapter({
        packageName: googlePlay.packageName,
        serviceAccountJsonPath: googlePlay.serviceAccountJsonPath,
        rtdnPushAudience: googlePlay.rtdnPushAudience,
        rtdnPushServiceAccountEmail: googlePlay.rtdnPushServiceAccountEmail,
        client: googlePlayClient,
      })
    );
  }

  return { googlePlayClient };
}
