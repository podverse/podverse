import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import { loggerService } from '@api/factories/loggerService.js';
import { getAuthenticatedUser } from '@api/lib/auth/index.js';
import { getBillingContext } from '@api/lib/billing/billingContext.js';
import { sendBillingError } from '@api/lib/billing/billingHttp.js';
import { getBillingStatus } from '@api/lib/billing/billingStatus.js';
import { getCheckoutOptions, normalizeStorefront } from '@api/lib/billing/checkoutOptions.js';
import {
  billingAppleTransactionBodySchema,
  billingCheckoutOptionsQuerySchema,
  billingGooglePurchaseBodySchema,
  billingPayPalCheckoutBodySchema,
  billingPayPalOrderParamsSchema,
  billingRestoreBodySchema,
  billingSimulateBodySchema,
  DEFAULT_JOI_VALIDATION_OPTIONS,
} from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import type { ObjectSchema } from 'joi';

import type {
  BillingEventOutcome,
  BillingEventSource,
  TestBillingEventSimulation,
} from '@podverse/billing';
import {
  BillingAdapterNotRegisteredError,
  BillingEventError,
  transactionSnapshotToEvents,
} from '@podverse/billing';
import type {
  BillingPlatform,
  DTOBillingEventOutcome,
  DTOBillingPayPalOrder,
  DTOBillingPurchaseResult,
  DTOBillingSimulationResult,
  DTOBillingStatus,
  NormalizedTransactionSnapshot,
  PaymentProcessorAdapter,
  PaymentProcessorId,
} from '@podverse/helpers';
import {
  BILLING_API_ERROR_CODES,
  BILLING_CLIENT_VERSION_HEADER,
  BillingProcessorRecordNotFoundError,
  BillingWebhookVerificationError,
} from '@podverse/helpers';
import type { BillingProcessorProduct } from '@podverse/orm';
import {
  AccountService,
  BillingPriceCatalogService,
  BillingProcessorProductService,
} from '@podverse/orm';

type CheckoutOptionsQuery = { platform: BillingPlatform; storefront?: string };
type PayPalCheckoutBody = {
  processor_product_id: number;
  return_url?: string;
  cancel_url?: string;
};
type PayPalOrderParams = { id: string };
type AppleTransactionBody = {
  transaction_id: string;
  product_id?: string;
  signed_transaction?: string;
};
type GooglePurchaseBody = {
  purchase_token: string;
  product_id: string;
  order_id: string;
};
type RestoreBody = {
  processor: 'apple' | 'google_play';
  purchases: {
    external_id: string;
    external_product_id?: string | null;
    external_transaction_id?: string | null;
    signed_transaction?: string | null;
  }[];
};
type SimulateBody = { event: TestBillingEventSimulation };

const PAYPAL_APPROVAL_RELS = ['approve', 'payer-action'];
const PAYPAL_CURRENCY_CODE = 'USD';

let priceCatalogService: BillingPriceCatalogService | undefined;
function getPriceCatalogService(): BillingPriceCatalogService {
  if (priceCatalogService === undefined) {
    priceCatalogService = new BillingPriceCatalogService();
  }
  return priceCatalogService;
}

/** Joi returns `any`; the schema is what makes the value match `T`. */
function parseInput<T>(schema: ObjectSchema, input: unknown, res: Response): T | null {
  const { error, value } = schema.validate(input, DEFAULT_JOI_VALIDATION_OPTIONS);
  if (error) {
    res.status(400).json({ message: error.details[0]?.message ?? 'Validation error' });
    return null;
  }
  const parsed: T = value;
  return parsed;
}

function toOutcomeDto(outcome: BillingEventOutcome): DTOBillingEventOutcome {
  return {
    status: outcome.status,
    error_code: outcome.status === 'failed' ? outcome.errorCode : null,
  };
}

const isConfirmed = (outcomes: DTOBillingEventOutcome[]): boolean =>
  outcomes.every((outcome) => outcome.status !== 'failed');

function findLink(links: { href: string; rel: string }[] | undefined, rels: string[]) {
  return links?.find((link) => rels.includes(link.rel))?.href ?? null;
}

async function requireStatus(accountId: number): Promise<DTOBillingStatus> {
  const status = await getBillingStatus(accountId);
  if (status === null) {
    throw new Error(`Account ${accountId} not found`);
  }
  return status;
}

function requireAdapter(processorId: PaymentProcessorId, res: Response) {
  const adapter = getBillingContext().registry.get(processorId);
  if (adapter === null) {
    sendBillingError(
      res,
      404,
      BILLING_API_ERROR_CODES.processorUnavailable,
      `${processorId} is not available`
    );
  }
  return adapter;
}

function isPayPalProduct(
  product: BillingProcessorProduct | null
): product is BillingProcessorProduct {
  return product !== null && product.processor_id === 'paypal' && product.is_active;
}

/** Records a verified payment against the signed-in account. */
async function ingestTransaction(
  snapshot: NormalizedTransactionSnapshot,
  accountId: number
): Promise<DTOBillingEventOutcome[]> {
  const { processor } = getBillingContext();
  const source: BillingEventSource = {
    schemaVersion: snapshot.schemaVersion,
    rawPayload: snapshot.rawPayload,
  };
  const outcomes: DTOBillingEventOutcome[] = [];
  for (const event of transactionSnapshotToEvents(snapshot, { accountId })) {
    outcomes.push(toOutcomeDto(await processor.ingestEvent(event, source)));
  }
  return outcomes;
}

async function sendPurchaseResult(
  res: Response,
  accountId: number,
  outcomes: DTOBillingEventOutcome[]
): Promise<void> {
  const result: DTOBillingPurchaseResult = {
    confirmed: isConfirmed(outcomes),
    outcomes,
    status: await requireStatus(accountId),
  };
  res.status(200).json(result);
}

function handleBillingError(res: Response, error: unknown): void {
  if (error instanceof BillingProcessorRecordNotFoundError) {
    sendBillingError(
      res,
      404,
      BILLING_API_ERROR_CODES.purchaseNotFound,
      'The processor has no record of this purchase'
    );
    return;
  }
  if (error instanceof BillingAdapterNotRegisteredError) {
    sendBillingError(res, 404, BILLING_API_ERROR_CODES.processorUnavailable, error.message);
    return;
  }
  if (error instanceof BillingEventError) {
    sendBillingError(
      res,
      409,
      error.code === 'account_unresolved'
        ? BILLING_API_ERROR_CODES.accountUnresolved
        : BILLING_API_ERROR_CODES.eventRejected,
      error.message
    );
    return;
  }
  handleGenericErrorResponse(res, error);
}

async function restoreOne(
  adapter: PaymentProcessorAdapter,
  accountId: number,
  purchase: RestoreBody['purchases'][number]
): Promise<DTOBillingEventOutcome[]> {
  const ref = {
    externalId: purchase.external_id,
    externalProductId: purchase.external_product_id ?? null,
    signedTransaction: purchase.signed_transaction ?? null,
    externalTransactionId: purchase.external_transaction_id ?? null,
  };
  try {
    return await ingestTransaction(await adapter.fetchTransaction(ref), accountId);
  } catch (error) {
    if (error instanceof BillingProcessorRecordNotFoundError) {
      return [{ status: 'failed', error_code: 'transaction_not_found' }];
    }
    if (error instanceof BillingEventError) {
      return [{ status: 'failed', error_code: error.code }];
    }
    throw error;
  }
}

export class BillingController {
  static async getCheckoutOptions(req: Request, res: Response): Promise<void> {
    const query = parseInput<CheckoutOptionsQuery>(
      billingCheckoutOptionsQuerySchema,
      req.query,
      res
    );
    if (query === null) {
      return;
    }
    try {
      const options = await getCheckoutOptions({
        registry: getBillingContext().registry,
        platform: query.platform,
        storefront: normalizeStorefront(query.storefront),
        clientVersion: req.get(BILLING_CLIENT_VERSION_HEADER) ?? null,
      });
      res.status(200).json(options);
    } catch (error) {
      handleGenericErrorResponse(res, error);
    }
  }

  static async getStatus(req: Request, res: Response): Promise<void> {
    const user = getAuthenticatedUser(req);
    try {
      const status = await getBillingStatus(user.id);
      if (status === null) {
        res.status(404).json({ message: 'Account not found' });
        return;
      }
      res.status(200).json(status);
    } catch (error) {
      handleGenericErrorResponse(res, error);
    }
  }

  static async createPayPalOrder(req: Request, res: Response): Promise<void> {
    const user = getAuthenticatedUser(req);
    const body = parseInput<PayPalCheckoutBody>(billingPayPalCheckoutBodySchema, req.body, res);
    if (body === null) {
      return;
    }
    const { paypalService } = getBillingContext();
    if (paypalService === null) {
      sendBillingError(
        res,
        404,
        BILLING_API_ERROR_CODES.processorUnavailable,
        'PayPal is not available'
      );
      return;
    }
    try {
      const product = await new BillingProcessorProductService().getActiveById(
        body.processor_product_id
      );
      if (!isPayPalProduct(product)) {
        sendBillingError(
          res,
          404,
          BILLING_API_ERROR_CODES.productUnavailable,
          'This product is not sold through PayPal'
        );
        return;
      }
      const account = await new AccountService().getWithMembershipStatusFromPrimary(user.id);
      if (account === null) {
        res.status(404).json({ message: 'Account not found' });
        return;
      }
      const pricing = await getPriceCatalogService().resolveProductMembership();
      const amount =
        product.billing_cadence === 'monthly'
          ? pricing.premiumMembershipCostMonthly
          : pricing.premiumMembershipCostAnnually;

      const order = await paypalService.createOrder({
        accountBillingCustomerRef: account.billing_customer_ref,
        cadence: product.billing_cadence,
        amount: amount.toFixed(2),
        currencyCode: PAYPAL_CURRENCY_CODE,
        returnUrl: body.return_url,
        cancelUrl: body.cancel_url,
      });
      if (order.id === undefined) {
        throw new Error('PayPal returned an order without an id');
      }
      const result: DTOBillingPayPalOrder = {
        order_id: order.id,
        status: order.status ?? null,
        approve_url: findLink(order.links, PAYPAL_APPROVAL_RELS),
      };
      res.status(201).json(result);
    } catch (error) {
      handleBillingError(res, error);
    }
  }

  static async capturePayPalOrder(req: Request, res: Response): Promise<void> {
    const user = getAuthenticatedUser(req);
    const params = parseInput<PayPalOrderParams>(billingPayPalOrderParamsSchema, req.params, res);
    if (params === null) {
      return;
    }
    const { paypalService } = getBillingContext();
    const adapter = requireAdapter('paypal', res);
    if (adapter === null) {
      return;
    }
    if (paypalService === null) {
      sendBillingError(
        res,
        404,
        BILLING_API_ERROR_CODES.processorUnavailable,
        'PayPal is not available'
      );
      return;
    }
    try {
      const order = await paypalService.captureOrder({ orderId: params.id });
      const purchaseUnit = order.purchaseUnits?.[0];
      const capture = purchaseUnit?.payments?.captures?.[0];
      if (capture?.id === undefined) {
        sendBillingError(
          res,
          409,
          BILLING_API_ERROR_CODES.eventRejected,
          'The order has no completed capture'
        );
        return;
      }
      const snapshot = await adapter.fetchTransaction({
        externalId: capture.id,
        externalProductId: purchaseUnit?.invoiceId ?? capture.invoiceId ?? null,
      });
      await sendPurchaseResult(res, user.id, await ingestTransaction(snapshot, user.id));
    } catch (error) {
      handleBillingError(res, error);
    }
  }

  static async postAppleTransaction(req: Request, res: Response): Promise<void> {
    const user = getAuthenticatedUser(req);
    const body = parseInput<AppleTransactionBody>(billingAppleTransactionBodySchema, req.body, res);
    if (body === null) {
      return;
    }
    const adapter = requireAdapter('apple', res);
    if (adapter === null) {
      return;
    }
    try {
      const snapshot = await adapter.fetchTransaction({
        externalId: body.transaction_id,
        externalProductId: body.product_id ?? null,
        signedTransaction: body.signed_transaction ?? null,
      });
      await sendPurchaseResult(res, user.id, await ingestTransaction(snapshot, user.id));
    } catch (error) {
      handleBillingError(res, error);
    }
  }

  /** Google refunds a purchase that is not acknowledged within three days of buying it. */
  static async postGooglePurchase(req: Request, res: Response): Promise<void> {
    const user = getAuthenticatedUser(req);
    const body = parseInput<GooglePurchaseBody>(billingGooglePurchaseBodySchema, req.body, res);
    if (body === null) {
      return;
    }
    const adapter = requireAdapter('google_play', res);
    if (adapter === null) {
      return;
    }
    try {
      const snapshot = await adapter.fetchTransaction({
        externalId: body.purchase_token,
        externalProductId: body.product_id,
        externalTransactionId: body.order_id,
      });
      const outcomes = await ingestTransaction(snapshot, user.id);
      if (isConfirmed(outcomes) && adapter.acknowledgePurchase !== undefined) {
        try {
          await adapter.acknowledgePurchase({
            purchaseToken: body.purchase_token,
            externalProductId: body.product_id,
          });
        } catch (error) {
          loggerService.logError(
            'Google Play acknowledgement failed; reconciliation retries it',
            error instanceof Error ? error : new Error(String(error))
          );
        }
      }
      await sendPurchaseResult(res, user.id, outcomes);
    } catch (error) {
      handleBillingError(res, error);
    }
  }

  /** Each purchase is restored on its own, so one the store no longer knows does not block the rest. */
  static async restorePurchases(req: Request, res: Response): Promise<void> {
    const user = getAuthenticatedUser(req);
    const body = parseInput<RestoreBody>(billingRestoreBodySchema, req.body, res);
    if (body === null) {
      return;
    }
    const adapter = requireAdapter(body.processor, res);
    if (adapter === null) {
      return;
    }
    try {
      const outcomes: DTOBillingEventOutcome[] = [];
      for (const purchase of body.purchases) {
        outcomes.push(...(await restoreOne(adapter, user.id, purchase)));
      }
      await sendPurchaseResult(res, user.id, outcomes);
    } catch (error) {
      handleBillingError(res, error);
    }
  }

  /**
   * Answers 400 only when the request is not authentic, so the processor stops redelivering it.
   * Once verified, every event is recorded in the inbox and the answer is 200 even when applying
   * one failed; reconciliation retries those. A 500 means nothing was recorded and asks the
   * processor to redeliver. An authentic notification that produces no events is still 200.
   */
  static receiveWebhook(processorId: PaymentProcessorId) {
    return async (req: Request, res: Response): Promise<void> => {
      const adapter = requireAdapter(processorId, res);
      if (adapter === null) {
        return;
      }
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      try {
        const parsed = await adapter.verifyAndParseWebhook({ rawBody, headers: req.headers });
        await getBillingContext().processor.ingestWebhook(parsed);
        res.status(200).json({ received: true });
      } catch (error) {
        if (error instanceof BillingWebhookVerificationError) {
          sendBillingError(
            res,
            400,
            BILLING_API_ERROR_CODES.webhookVerificationFailed,
            'Webhook verification failed'
          );
          return;
        }
        loggerService.logError(
          `${processorId} webhook could not be recorded`,
          error instanceof Error ? error : new Error(String(error))
        );
        res.status(500).json({ message: 'Webhook could not be recorded' });
      }
    };
  }

  /** Only reachable while the test processor is registered, which production refuses. */
  static async simulateTestEvent(req: Request, res: Response): Promise<void> {
    const user = getAuthenticatedUser(req);
    const { testAdapter, processor } = getBillingContext();
    if (testAdapter === null) {
      sendBillingError(
        res,
        403,
        BILLING_API_ERROR_CODES.testAdapterUnavailable,
        'The test processor is not available in this environment'
      );
      return;
    }
    const body = parseInput<SimulateBody>(billingSimulateBodySchema, req.body, res);
    if (body === null) {
      return;
    }
    try {
      const event = testAdapter.simulateEvent({
        ...body.event,
        accountId: user.id,
        accountBillingCustomerRef: null,
      });
      const outcome = await processor.ingestEvent(event);
      const result: DTOBillingSimulationResult = {
        outcome: toOutcomeDto(outcome),
        status: await requireStatus(user.id),
      };
      res.status(200).json(result);
    } catch (error) {
      handleBillingError(res, error);
    }
  }
}
