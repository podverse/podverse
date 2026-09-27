import { getDataSourceRead, getDataSourceReadWrite } from '@orm/context.js';
import { BillingProcessorProduct } from '@orm/entities/billingProcessorProduct.js';
import { BillingProduct } from '@orm/entities/billingProduct.js';
import type { DataSource, EntityManager } from 'typeorm';
import { In, IsNull } from 'typeorm';

import type { BillingCadence, PaymentProcessorId, PurchaseKind } from '@podverse/helpers';

import { PREMIUM_BILLING_PRODUCT_CODE } from './billingPriceCatalog.js';

type BillingProcessorProductServiceParams = {
  dataSourceRead?: DataSource;
  dataSourceReadWrite?: DataSource;
};

type UpsertPremiumProcessorProductParams = {
  processorId: PaymentProcessorId;
  externalProductId: string;
  externalBasePlanId: string | null;
  cadence: BillingCadence;
  purchaseKind: PurchaseKind;
};

type UpsertPremiumProcessorProductResult = {
  processorProduct: BillingProcessorProduct;
  created: boolean;
};

/** Maps a processor's store ids to the Premium product, cadence, and purchase kind. */
export class BillingProcessorProductService {
  private dataSourceRead: DataSource;
  private dataSourceReadWrite: DataSource;

  constructor(params?: BillingProcessorProductServiceParams) {
    this.dataSourceRead = params?.dataSourceRead ?? getDataSourceRead();
    this.dataSourceReadWrite = params?.dataSourceReadWrite ?? getDataSourceReadWrite();
  }

  async listAll(): Promise<BillingProcessorProduct[]> {
    return this.dataSourceRead.getRepository(BillingProcessorProduct).find({
      relations: { billing_product: true },
      order: { processor_id: 'ASC', id: 'ASC' },
    });
  }

  async getById(id: number): Promise<BillingProcessorProduct | null> {
    return this.dataSourceRead.getRepository(BillingProcessorProduct).findOne({
      where: { id },
      relations: { billing_product: true },
    });
  }

  /** Null when no product has this id. Omitted fields keep their stored value. */
  async updateById(
    id: number,
    params: {
      isActive?: boolean;
      externalProductId?: string;
      externalBasePlanId?: string | null;
    }
  ): Promise<BillingProcessorProduct | null> {
    const repository = this.dataSourceReadWrite.getRepository(BillingProcessorProduct);
    const product = await repository.findOne({ where: { id } });
    if (product === null) {
      return null;
    }
    if (params.isActive !== undefined) {
      product.is_active = params.isActive;
    }
    if (params.externalProductId !== undefined) {
      product.external_product_id = params.externalProductId;
    }
    if (params.externalBasePlanId !== undefined) {
      product.external_base_plan_id = params.externalBasePlanId;
    }
    return repository.save(product);
  }

  /** Active products of the given processors with their catalog product, for checkout options. */
  async listActiveForProcessors(processorIds: string[]): Promise<BillingProcessorProduct[]> {
    if (processorIds.length === 0) {
      return [];
    }
    return this.dataSourceRead.getRepository(BillingProcessorProduct).find({
      where: { processor_id: In(processorIds), is_active: true },
      relations: { billing_product: true },
      order: { processor_id: 'ASC', id: 'ASC' },
    });
  }

  /** The active product a client picked at checkout; null when it is unknown or retired. */
  async getActiveById(id: number): Promise<BillingProcessorProduct | null> {
    return this.dataSourceRead.getRepository(BillingProcessorProduct).findOne({
      where: { id, is_active: true },
      relations: { billing_product: true },
    });
  }

  async getByExternalIds(
    processorId: string,
    externalProductId: string,
    externalBasePlanId: string | null
  ): Promise<BillingProcessorProduct | null> {
    return this.getByExternalIdsWithManager(
      this.dataSourceRead.manager,
      processorId,
      externalProductId,
      externalBasePlanId
    );
  }

  async getByExternalIdsWithManager(
    transactionalEntityManager: EntityManager,
    processorId: string,
    externalProductId: string,
    externalBasePlanId: string | null
  ): Promise<BillingProcessorProduct | null> {
    return transactionalEntityManager.getRepository(BillingProcessorProduct).findOne({
      where: {
        processor_id: processorId,
        external_product_id: externalProductId,
        external_base_plan_id: externalBasePlanId === null ? IsNull() : externalBasePlanId,
      },
    });
  }

  /** Creates the Premium product row first when the database has none. */
  async upsertPremiumProcessorProduct(
    params: UpsertPremiumProcessorProductParams
  ): Promise<UpsertPremiumProcessorProductResult> {
    return this.dataSourceReadWrite.transaction(async (transactionalEntityManager) => {
      await transactionalEntityManager.query(
        `
        INSERT INTO billing_product (product_code, name, is_active)
        SELECT $1, $2, TRUE
        WHERE NOT EXISTS (
          SELECT 1
          FROM billing_product
          WHERE product_code = $1
        )
        `,
        [PREMIUM_BILLING_PRODUCT_CODE, 'Premium Membership']
      );
      const premiumProduct = await transactionalEntityManager
        .getRepository(BillingProduct)
        .findOneOrFail({ where: { product_code: PREMIUM_BILLING_PRODUCT_CODE } });

      const repository = transactionalEntityManager.getRepository(BillingProcessorProduct);
      const existing = await this.getByExternalIdsWithManager(
        transactionalEntityManager,
        params.processorId,
        params.externalProductId,
        params.externalBasePlanId
      );

      if (existing === null) {
        const processorProduct = await repository.save(
          repository.create({
            processor_id: params.processorId,
            external_product_id: params.externalProductId,
            external_base_plan_id: params.externalBasePlanId,
            billing_product_id: premiumProduct.id,
            billing_cadence: params.cadence,
            purchase_kind: params.purchaseKind,
            is_active: true,
          })
        );
        return { processorProduct, created: true };
      }

      existing.billing_product_id = premiumProduct.id;
      existing.billing_cadence = params.cadence;
      existing.purchase_kind = params.purchaseKind;
      existing.is_active = true;
      return { processorProduct: await repository.save(existing), created: false };
    });
  }
}

export type { UpsertPremiumProcessorProductParams, UpsertPremiumProcessorProductResult };
