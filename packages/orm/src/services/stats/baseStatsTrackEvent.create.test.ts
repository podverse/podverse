import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  repoCreateQueryBuilder,
  qbInsert,
  qbValues,
  qbOrIgnore,
  qbExecute,
  getRepository,
  accountGuidGetByAccountId,
} = vi.hoisted(() => ({
  repoCreateQueryBuilder: vi.fn(),
  qbInsert: vi.fn(),
  qbValues: vi.fn(),
  qbOrIgnore: vi.fn(),
  qbExecute: vi.fn(),
  getRepository: vi.fn(),
  accountGuidGetByAccountId: vi.fn(),
}));

vi.mock('@orm/db/index.js', () => ({
  AppDataSourceReadWrite: {
    manager: {
      getRepository,
      connection: {
        getMetadata: vi.fn(),
      },
    },
  },
}));

vi.mock('@orm/services/stats/statsTrackAccountGuid.js', () => ({
  StatsTrackAccountGuidService: class {
    getByAccountId = accountGuidGetByAccountId;
  },
}));

import { BaseStatsTrackEventService } from './baseStatsTrackEvent.js';

class StatsTrackEventItemServiceForTest extends BaseStatsTrackEventService<{ item_id: number }> {
  protected entity = class StatsTrackEventItemEntity {
    item_id!: number;
  };
  protected entityIdField = 'item_id';
  private getEntityByIdTextMock = vi.fn();

  setGetEntityByIdTextResult(result: { id: number } | null): void {
    this.getEntityByIdTextMock.mockResolvedValue(result);
  }

  protected async getEntityByIdText(): Promise<{ id: number } | null> {
    return this.getEntityByIdTextMock();
  }
}

describe('BaseStatsTrackEventService._create', () => {
  beforeEach(() => {
    qbExecute.mockReset();
    qbOrIgnore.mockReset();
    qbValues.mockReset();
    qbInsert.mockReset();
    repoCreateQueryBuilder.mockReset();
    getRepository.mockReset();
    accountGuidGetByAccountId.mockReset();

    qbExecute.mockResolvedValue({});
    qbOrIgnore.mockReturnValue({ execute: qbExecute });
    qbValues.mockReturnValue({ orIgnore: qbOrIgnore });
    qbInsert.mockReturnValue({ values: qbValues });
    repoCreateQueryBuilder.mockReturnValue({ insert: qbInsert });
    getRepository.mockReturnValue({
      createQueryBuilder: repoCreateQueryBuilder,
    });
    accountGuidGetByAccountId.mockResolvedValue({ account_guid: 'ag-1' });
  });

  it('uses conflict-ignore insert for idempotent event writes', async () => {
    const service = new StatsTrackEventItemServiceForTest();
    service.setGetEntityByIdTextResult({ id: 42 });

    await service._create(7, 'item-42');

    expect(qbInsert).toHaveBeenCalledTimes(1);
    expect(qbValues).toHaveBeenCalledWith({
      account_guid: 'ag-1',
      item_id: 42,
      created_at: expect.any(Date),
    });
    expect(qbOrIgnore).toHaveBeenCalledTimes(1);
    expect(qbExecute).toHaveBeenCalledTimes(1);
  });
});
