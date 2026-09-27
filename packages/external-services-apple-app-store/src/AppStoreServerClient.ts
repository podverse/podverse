import { readFileSync } from 'node:fs';

import {
  APIException,
  AppStoreServerAPIClient,
  Environment,
  SignedDataVerifier,
} from '@apple/app-store-server-library';
import type {
  JWSRenewalInfoDecodedPayload,
  JWSTransactionDecodedPayload,
  ResponseBodyV2DecodedPayload,
  SendTestNotificationResponse,
  StatusResponse,
  TransactionInfoResponse,
} from '@apple/app-store-server-library';

import { getDefaultAppleRootCertificates } from './appleRootCertificates.js';

const APPLE_TRANSACTION_NOT_FOUND_API_ERROR = 4040010;

export type AppleRuntimeEnvironment = 'sandbox' | 'production';

export interface AppleApiClient {
  getAllSubscriptionStatuses(anyTransactionId: string): Promise<StatusResponse>;
  getTransactionInfo(transactionId: string): Promise<TransactionInfoResponse>;
  requestTestNotification(): Promise<SendTestNotificationResponse>;
}

export interface AppleSignedPayloadVerifier {
  verifyAndDecodeNotification(signedPayload: string): Promise<ResponseBodyV2DecodedPayload>;
  verifyAndDecodeRenewalInfo(signedRenewalInfo: string): Promise<JWSRenewalInfoDecodedPayload>;
  verifyAndDecodeTransaction(
    signedTransactionInfo: string
  ): Promise<JWSTransactionDecodedPayload>;
}

export interface AppleClientConfig {
  issuerId: string;
  keyId: string;
  privateKey: string;
  bundleId: string;
  appAppleId?: number;
  runtimeEnvironment: AppleRuntimeEnvironment;
  rootCertificates?: Buffer[];
  enableOnlineChecks?: boolean;
  productionClient?: AppleApiClient;
  sandboxClient?: AppleApiClient;
  productionVerifier?: AppleSignedPayloadVerifier;
  sandboxVerifier?: AppleSignedPayloadVerifier;
}

export interface CreateAppleClientConfig {
  issuerId: string;
  keyId: string;
  privateKeyPath: string;
  bundleId: string;
  appAppleId?: number;
  appleEnvironment?: string | undefined;
  nodeEnv?: string | undefined;
  rootCertificates?: Buffer[];
  enableOnlineChecks?: boolean;
  productionClient?: AppleApiClient;
  sandboxClient?: AppleApiClient;
  productionVerifier?: AppleSignedPayloadVerifier;
  sandboxVerifier?: AppleSignedPayloadVerifier;
}

export interface VerifiedNotificationPayload {
  notification: ResponseBodyV2DecodedPayload;
  transaction: JWSTransactionDecodedPayload | null;
  renewalInfo: JWSRenewalInfoDecodedPayload | null;
  environment: Environment;
}

function parseAppleEnvironment(value: string | undefined): AppleRuntimeEnvironment | null {
  if (value === undefined) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'sandbox') {
    return 'sandbox';
  }
  if (normalized === 'production' || normalized === 'prod' || normalized === 'live') {
    return 'production';
  }
  return null;
}

export function resolveAppleRuntimeEnvironment(
  appleEnvironment: string | undefined,
  nodeEnv: string | undefined
): AppleRuntimeEnvironment {
  const configured = parseAppleEnvironment(appleEnvironment);
  if (configured !== null) {
    return configured;
  }
  return nodeEnv === 'production' ? 'production' : 'sandbox';
}

function toSdkEnvironment(environment: AppleRuntimeEnvironment): Environment {
  return environment === 'production' ? Environment.PRODUCTION : Environment.SANDBOX;
}

function parseAppAppleId(value: number | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  return Number.isFinite(value) ? value : undefined;
}

function readSigningKeyFromPath(path: string): string {
  const trimmedPath = path.trim();
  if (trimmedPath === '') {
    throw new Error('APPLE_IAP_PRIVATE_KEY_PATH is required');
  }
  return readFileSync(trimmedPath, 'utf8');
}

function parseNotificationEnvironment(
  notification: ResponseBodyV2DecodedPayload
): Environment | undefined {
  const environmentFromData = notification.data?.environment;
  if (environmentFromData === Environment.SANDBOX || environmentFromData === 'Sandbox') {
    return Environment.SANDBOX;
  }
  if (environmentFromData === Environment.PRODUCTION || environmentFromData === 'Production') {
    return Environment.PRODUCTION;
  }
  return undefined;
}

function isApiNotFoundError(error: unknown): boolean {
  if (error instanceof APIException) {
    return (
      error.httpStatusCode === 404 ||
      error.apiError === APPLE_TRANSACTION_NOT_FOUND_API_ERROR ||
      error.apiError === Number(APPLE_TRANSACTION_NOT_FOUND_API_ERROR)
    );
  }
  if (typeof error === 'object' && error !== null) {
    const httpStatusCode = Reflect.get(error, 'httpStatusCode');
    const apiError = Reflect.get(error, 'apiError');
    return (
      httpStatusCode === 404 ||
      apiError === APPLE_TRANSACTION_NOT_FOUND_API_ERROR ||
      apiError === Number(APPLE_TRANSACTION_NOT_FOUND_API_ERROR)
    );
  }
  return false;
}

function isInvalidEnvironmentVerificationError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.message.includes('INVALID_ENVIRONMENT');
}

interface VerifiedNotificationEnvelope {
  notification: ResponseBodyV2DecodedPayload;
  environment: Environment;
}

export class AppStoreServerClient {
  private readonly productionClient: AppleApiClient | null;
  private readonly sandboxClient: AppleApiClient;
  private readonly productionVerifier: AppleSignedPayloadVerifier | null;
  private readonly sandboxVerifier: AppleSignedPayloadVerifier;
  private readonly primaryApiClient: AppleApiClient;
  private readonly primaryEnvironment: Environment;
  private readonly fallbackApiClient: AppleApiClient | null;
  private readonly fallbackEnvironment: Environment | null;

  constructor(config: AppleClientConfig) {
    const runtimeEnvironment = config.runtimeEnvironment;
    const rootCertificates = config.rootCertificates ?? getDefaultAppleRootCertificates();
    const enableOnlineChecks = config.enableOnlineChecks ?? true;
    const parsedAppAppleId = parseAppAppleId(config.appAppleId);

    this.sandboxClient =
      config.sandboxClient ??
      new AppStoreServerAPIClient(
        config.privateKey,
        config.keyId,
        config.issuerId,
        config.bundleId,
        Environment.SANDBOX
      );

    this.sandboxVerifier =
      config.sandboxVerifier ??
      new SignedDataVerifier(
        rootCertificates,
        enableOnlineChecks,
        Environment.SANDBOX,
        config.bundleId,
        undefined
      );

    if (runtimeEnvironment === 'production') {
      this.productionClient =
        config.productionClient ??
        new AppStoreServerAPIClient(
          config.privateKey,
          config.keyId,
          config.issuerId,
          config.bundleId,
          Environment.PRODUCTION
        );
      this.productionVerifier =
        config.productionVerifier ??
        new SignedDataVerifier(
          rootCertificates,
          enableOnlineChecks,
          Environment.PRODUCTION,
          config.bundleId,
          parsedAppAppleId
        );
      this.primaryApiClient = this.productionClient;
      this.primaryEnvironment = Environment.PRODUCTION;
      this.fallbackApiClient = this.sandboxClient;
      this.fallbackEnvironment = Environment.SANDBOX;
      return;
    }

    this.productionClient = config.productionClient ?? null;
    this.productionVerifier = config.productionVerifier ?? null;
    this.primaryApiClient = this.sandboxClient;
    this.primaryEnvironment = Environment.SANDBOX;
    this.fallbackApiClient = null;
    this.fallbackEnvironment = null;
  }

  static fromConfig(config: CreateAppleClientConfig): AppStoreServerClient {
    return new AppStoreServerClient({
      issuerId: config.issuerId,
      keyId: config.keyId,
      privateKey: readSigningKeyFromPath(config.privateKeyPath),
      bundleId: config.bundleId,
      appAppleId: config.appAppleId,
      runtimeEnvironment: resolveAppleRuntimeEnvironment(config.appleEnvironment, config.nodeEnv),
      rootCertificates: config.rootCertificates,
      enableOnlineChecks: config.enableOnlineChecks,
      productionClient: config.productionClient,
      sandboxClient: config.sandboxClient,
      productionVerifier: config.productionVerifier,
      sandboxVerifier: config.sandboxVerifier,
    });
  }

  isPrimaryEnvironmentSandbox(): boolean {
    return this.primaryEnvironment === Environment.SANDBOX;
  }

  async getTransactionInfoWithFallback(
    transactionId: string
  ): Promise<{ response: TransactionInfoResponse; environment: Environment }> {
    try {
      return {
        response: await this.primaryApiClient.getTransactionInfo(transactionId),
        environment: this.primaryEnvironment,
      };
    } catch (error) {
      if (
        this.fallbackApiClient === null ||
        this.fallbackEnvironment === null ||
        !isApiNotFoundError(error)
      ) {
        throw error;
      }
      return {
        response: await this.fallbackApiClient.getTransactionInfo(transactionId),
        environment: this.fallbackEnvironment,
      };
    }
  }

  async getAllSubscriptionStatusesWithFallback(
    anyTransactionId: string
  ): Promise<{ response: StatusResponse; environment: Environment }> {
    try {
      return {
        response: await this.primaryApiClient.getAllSubscriptionStatuses(anyTransactionId),
        environment: this.primaryEnvironment,
      };
    } catch (error) {
      if (
        this.fallbackApiClient === null ||
        this.fallbackEnvironment === null ||
        !isApiNotFoundError(error)
      ) {
        throw error;
      }
      return {
        response: await this.fallbackApiClient.getAllSubscriptionStatuses(anyTransactionId),
        environment: this.fallbackEnvironment,
      };
    }
  }

  async requestTestNotification(): Promise<{
    response: SendTestNotificationResponse;
    environment: Environment;
  }> {
    return {
      response: await this.primaryApiClient.requestTestNotification(),
      environment: this.primaryEnvironment,
    };
  }

  async verifyAndDecodeTransaction(
    signedTransactionInfo: string,
    environment: Environment
  ): Promise<JWSTransactionDecodedPayload> {
    return this.verifyTransaction(signedTransactionInfo, environment);
  }

  async verifyAndDecodeRenewalInfo(
    signedRenewalInfo: string,
    environment: Environment
  ): Promise<JWSRenewalInfoDecodedPayload> {
    return this.verifyRenewalInfo(signedRenewalInfo, environment);
  }

  async verifyAndDecodeNotification(signedPayload: string): Promise<VerifiedNotificationPayload> {
    const envelope = await this.verifyNotificationWithFallback(signedPayload);
    const signedTransactionInfo = envelope.notification.data?.signedTransactionInfo;
    const signedRenewalInfo = envelope.notification.data?.signedRenewalInfo;
    const transaction =
      signedTransactionInfo === undefined
        ? null
        : await this.verifyTransaction(signedTransactionInfo, envelope.environment);
    const renewalInfo =
      signedRenewalInfo === undefined
        ? null
        : await this.verifyRenewalInfo(signedRenewalInfo, envelope.environment);

    return {
      notification: envelope.notification,
      transaction,
      renewalInfo,
      environment: envelope.environment,
    };
  }

  private async verifyNotificationWithFallback(
    signedPayload: string
  ): Promise<VerifiedNotificationEnvelope> {
    try {
      const notification = await this.verifierForEnvironment(
        this.primaryEnvironment
      ).verifyAndDecodeNotification(signedPayload);
      return {
        notification,
        environment: parseNotificationEnvironment(notification) ?? this.primaryEnvironment,
      };
    } catch (error) {
      if (
        this.fallbackEnvironment === null ||
        !isInvalidEnvironmentVerificationError(error) ||
        !this.hasVerifierForEnvironment(this.fallbackEnvironment)
      ) {
        throw error;
      }
      const notification = await this.verifierForEnvironment(
        this.fallbackEnvironment
      ).verifyAndDecodeNotification(signedPayload);
      return {
        notification,
        environment: parseNotificationEnvironment(notification) ?? this.fallbackEnvironment,
      };
    }
  }

  private hasVerifierForEnvironment(environment: Environment): boolean {
    if (environment === Environment.PRODUCTION) {
      return this.productionVerifier !== null;
    }
    return true;
  }

  private verifierForEnvironment(environment: Environment): AppleSignedPayloadVerifier {
    if (environment === Environment.PRODUCTION) {
      if (this.productionVerifier === null) {
        throw new Error('Apple production verifier is not configured');
      }
      return this.productionVerifier;
    }
    return this.sandboxVerifier;
  }

  private async verifyTransaction(
    signedTransactionInfo: string,
    environment: Environment
  ): Promise<JWSTransactionDecodedPayload> {
    return this.verifierForEnvironment(environment).verifyAndDecodeTransaction(signedTransactionInfo);
  }

  private async verifyRenewalInfo(
    signedRenewalInfo: string,
    environment: Environment
  ): Promise<JWSRenewalInfoDecodedPayload> {
    return this.verifierForEnvironment(environment).verifyAndDecodeRenewalInfo(signedRenewalInfo);
  }
}
