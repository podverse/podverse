import { readFileSync } from 'node:fs';

import { androidpublisher, auth as androidPublisherAuth } from '@googleapis/androidpublisher';
import { OAuth2Client } from 'google-auth-library';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toRawPayload(value: unknown): Record<string, unknown> {
  const json = JSON.stringify(value);
  const parsed: unknown = JSON.parse(json);
  return isRecord(parsed) ? parsed : {};
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = Reflect.get(record, key);
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function readNumber(record: Record<string, unknown>, key: string): number | null {
  const value = Reflect.get(record, key);
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function readArray(record: Record<string, unknown>, key: string): unknown[] {
  const value = Reflect.get(record, key);
  return Array.isArray(value) ? value : [];
}

function readRecord(record: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const value = Reflect.get(record, key);
  return isRecord(value) ? value : null;
}

function parseGoogleApiErrorStatus(error: unknown): number | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }
  const code = Reflect.get(error, 'code');
  if (typeof code === 'number') {
    return code;
  }
  const response = Reflect.get(error, 'response');
  if (!isRecord(response)) {
    return null;
  }
  const status = Reflect.get(response, 'status');
  return typeof status === 'number' ? status : null;
}

function isNotFoundError(error: unknown): boolean {
  const status = parseGoogleApiErrorStatus(error);
  return status === 404;
}

function parseVoidedProductType(value: number | null): 'subscription' | 'one_time' | 'unknown' {
  if (value === 1) {
    return 'subscription';
  }
  if (value === 2) {
    return 'one_time';
  }
  return 'unknown';
}

function parseVoidedReason(value: number | null): 'refund' | 'chargeback' {
  return value === 2 ? 'chargeback' : 'refund';
}

function toIsoFromMillis(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return new Date(parsed).toISOString();
}

function ensureServiceAccountJson(path: string): void {
  const trimmedPath = path.trim();
  if (trimmedPath === '') {
    throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_PATH is required');
  }
  const contents = readFileSync(trimmedPath, 'utf8');
  const parsed: unknown = JSON.parse(contents);
  if (!isRecord(parsed)) {
    throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_PATH must point to a JSON object');
  }
  const clientEmail = readString(parsed, 'client_email');
  const privateKey = readString(parsed, 'private_key');
  if (clientEmail === null || privateKey === null) {
    throw new Error(
      'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_PATH JSON must include client_email and private_key'
    );
  }
}

export interface GoogleIdTokenPayload {
  email?: string;
  email_verified?: boolean;
}

export interface GoogleIdTokenTicket {
  getPayload(): GoogleIdTokenPayload | undefined;
}

export interface GoogleIdTokenVerifier {
  verifyIdToken(params: { idToken: string; audience: string }): Promise<GoogleIdTokenTicket>;
}

interface SubscriptionsV2Api {
  get(params: { packageName: string; token: string }): Promise<{ data: unknown }>;
}

interface SubscriptionsApi {
  acknowledge(params: {
    packageName: string;
    subscriptionId: string;
    token: string;
    requestBody: Record<string, never>;
  }): Promise<unknown>;
}

interface ProductsApi {
  get(params: { packageName: string; productId: string; token: string }): Promise<{ data: unknown }>;
  acknowledge(params: {
    packageName: string;
    productId: string;
    token: string;
    requestBody: Record<string, never>;
  }): Promise<unknown>;
}

interface VoidedPurchasesApi {
  list(params: {
    packageName: string;
    startTime?: string;
    endTime?: string;
    pageToken?: string;
    maxResults?: number;
    type?: number;
  }): Promise<{ data: unknown }>;
}

interface AndroidPublisherLike {
  purchases: {
    subscriptionsv2: SubscriptionsV2Api;
    subscriptions: SubscriptionsApi;
    products: ProductsApi;
    voidedpurchases: VoidedPurchasesApi;
  };
}

export interface PlayDeveloperClientConfig {
  packageName: string;
  serviceAccountJsonPath: string;
  androidPublisherClient?: AndroidPublisherLike;
  idTokenVerifier?: GoogleIdTokenVerifier;
}

export interface ListVoidedPurchasesParams {
  startTimeMillis?: number;
  endTimeMillis?: number;
  pageToken?: string;
  maxResults?: number;
  /** Google API filter: 0 all, 1 subscriptions, 2 one-time products. */
  type?: 0 | 1 | 2;
}

export interface GooglePlayVoidedPurchase {
  orderId: string | null;
  purchaseToken: string | null;
  voidedAt: string | null;
  productType: 'subscription' | 'one_time' | 'unknown';
  reason: 'refund' | 'chargeback';
  rawPayload: Record<string, unknown>;
}

export interface GooglePlayVoidedPurchasesPage {
  purchases: GooglePlayVoidedPurchase[];
  nextPageToken: string | null;
}

export interface GooglePlayClient {
  getIdTokenVerifier(): GoogleIdTokenVerifier;
  getSubscriptionPurchase(purchaseToken: string): Promise<Record<string, unknown> | null>;
  acknowledgeSubscriptionPurchase(subscriptionId: string, purchaseToken: string): Promise<void>;
  getProductPurchase(
    productId: string,
    purchaseToken: string
  ): Promise<Record<string, unknown> | null>;
  acknowledgeProductPurchase(productId: string, purchaseToken: string): Promise<void>;
  listVoidedPurchases(params?: ListVoidedPurchasesParams): Promise<GooglePlayVoidedPurchasesPage>;
}

export class PlayDeveloperClient implements GooglePlayClient {
  private readonly packageName: string;
  private readonly publisher: AndroidPublisherLike;
  private readonly idTokenVerifier: GoogleIdTokenVerifier;

  constructor(config: PlayDeveloperClientConfig) {
    this.packageName = config.packageName;
    const trimmedPackageName = this.packageName.trim();
    if (trimmedPackageName === '') {
      throw new Error('GOOGLE_PLAY_PACKAGE_NAME is required');
    }
    this.packageName = trimmedPackageName;

    if (config.androidPublisherClient !== undefined) {
      this.publisher = config.androidPublisherClient;
    } else {
      ensureServiceAccountJson(config.serviceAccountJsonPath);
      const auth = new androidPublisherAuth.GoogleAuth({
        keyFile: config.serviceAccountJsonPath,
        scopes: ['https://www.googleapis.com/auth/androidpublisher'],
      });
      this.publisher = androidpublisher({
        auth,
        version: 'v3',
      });
    }

    this.idTokenVerifier = config.idTokenVerifier ?? new OAuth2Client();
  }

  getIdTokenVerifier(): GoogleIdTokenVerifier {
    return this.idTokenVerifier;
  }

  async getSubscriptionPurchase(purchaseToken: string): Promise<Record<string, unknown> | null> {
    try {
      const response = await this.publisher.purchases.subscriptionsv2.get({
        packageName: this.packageName,
        token: purchaseToken,
      });
      return toRawPayload(response.data);
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  async acknowledgeSubscriptionPurchase(
    subscriptionId: string,
    purchaseToken: string
  ): Promise<void> {
    await this.publisher.purchases.subscriptions.acknowledge({
      packageName: this.packageName,
      subscriptionId,
      token: purchaseToken,
      requestBody: {},
    });
  }

  async getProductPurchase(
    productId: string,
    purchaseToken: string
  ): Promise<Record<string, unknown> | null> {
    try {
      const response = await this.publisher.purchases.products.get({
        packageName: this.packageName,
        productId,
        token: purchaseToken,
      });
      return toRawPayload(response.data);
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  async acknowledgeProductPurchase(productId: string, purchaseToken: string): Promise<void> {
    await this.publisher.purchases.products.acknowledge({
      packageName: this.packageName,
      productId,
      token: purchaseToken,
      requestBody: {},
    });
  }

  async listVoidedPurchases(
    params: ListVoidedPurchasesParams = {}
  ): Promise<GooglePlayVoidedPurchasesPage> {
    const response = await this.publisher.purchases.voidedpurchases.list({
      packageName: this.packageName,
      startTime:
        params.startTimeMillis === undefined ? undefined : String(Math.trunc(params.startTimeMillis)),
      endTime: params.endTimeMillis === undefined ? undefined : String(Math.trunc(params.endTimeMillis)),
      pageToken: params.pageToken,
      maxResults: params.maxResults,
      type: params.type,
    });
    const payload = toRawPayload(response.data);
    const purchases = readArray(payload, 'voidedPurchases')
      .filter((item): item is Record<string, unknown> => isRecord(item))
      .map((item) => {
        const refundType = readNumber(item, 'refundType');
        const productType = readNumber(item, 'productType');
        return {
          orderId: readString(item, 'orderId'),
          purchaseToken: readString(item, 'purchaseToken'),
          voidedAt: toIsoFromMillis(readString(item, 'voidedTimeMillis')),
          productType: parseVoidedProductType(productType),
          reason: parseVoidedReason(refundType),
          rawPayload: item,
        };
      });
    return {
      purchases,
      nextPageToken: readString(readRecord(payload, 'tokenPagination') ?? {}, 'nextPageToken'),
    };
  }
}
