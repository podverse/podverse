import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  accountServiceGetMock,
  getRepositoryReadMock,
  getRepositoryReadWriteMock,
  repositoryReadCreateQueryBuilderMock,
  repositoryReadWriteCreateQueryBuilderMock,
  repositoryReadExecuteMock,
  repositoryReadWriteExecuteMock,
} = vi.hoisted(() => ({
  accountServiceGetMock: vi.fn(),
  getRepositoryReadMock: vi.fn(),
  getRepositoryReadWriteMock: vi.fn(),
  repositoryReadCreateQueryBuilderMock: vi.fn(),
  repositoryReadWriteCreateQueryBuilderMock: vi.fn(),
  repositoryReadExecuteMock: vi.fn(),
  repositoryReadWriteExecuteMock: vi.fn(),
}));

vi.mock('@orm/context.js', () => ({
  getDataSourceRead: () => ({
    getRepository: getRepositoryReadMock,
  }),
  getDataSourceReadWrite: () => ({
    getRepository: getRepositoryReadWriteMock,
  }),
  getLoggerService: () => ({
    debug: vi.fn(),
  }),
}));

vi.mock('@orm/services/account/account.js', () => ({
  AccountService: class AccountServiceMock {
    get = accountServiceGetMock;
  },
}));

vi.mock('@orm/services/account/accountNotificationChannel.js', () => ({
  AccountNotificationChannelService: class AccountNotificationChannelServiceMock {},
}));

import { AccountFCMDeviceService } from './accountFCMDevice.js';
import { AccountUPDeviceService } from './accountUPDevice.js';
import { AccountWebPushDeviceService } from './accountWebPushDevice.js';

const createChain = (executeMock: ReturnType<typeof vi.fn>) => {
  const chain: {
    update: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    where: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    from: ReturnType<typeof vi.fn>;
    execute: ReturnType<typeof vi.fn>;
  } = {
    update: vi.fn(),
    set: vi.fn(),
    where: vi.fn(),
    delete: vi.fn(),
    from: vi.fn(),
    execute: executeMock,
  };
  chain.update.mockReturnValue(chain);
  chain.set.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.delete.mockReturnValue(chain);
  chain.from.mockReturnValue(chain);
  return chain;
};

describe('device locale and delete writes use the read-write role', () => {
  beforeEach(() => {
    accountServiceGetMock.mockReset();
    getRepositoryReadMock.mockReset();
    getRepositoryReadWriteMock.mockReset();
    repositoryReadCreateQueryBuilderMock.mockReset();
    repositoryReadWriteCreateQueryBuilderMock.mockReset();
    repositoryReadExecuteMock.mockReset();
    repositoryReadWriteExecuteMock.mockReset();

    accountServiceGetMock.mockResolvedValue({ id: 41 });

    const readChain = createChain(repositoryReadExecuteMock);
    const writeChain = createChain(repositoryReadWriteExecuteMock);

    repositoryReadCreateQueryBuilderMock.mockReturnValue(readChain);
    repositoryReadWriteCreateQueryBuilderMock.mockReturnValue(writeChain);

    getRepositoryReadMock.mockReturnValue({
      createQueryBuilder: repositoryReadCreateQueryBuilderMock,
    });
    getRepositoryReadWriteMock.mockReturnValue({
      createQueryBuilder: repositoryReadWriteCreateQueryBuilderMock,
    });
  });

  it('AccountFCMDeviceService.updateLocaleForAccount writes on the read-write connection', async () => {
    const service = new AccountFCMDeviceService();
    await service.updateLocaleForAccount(41, { locale: 'en-US' });

    expect(repositoryReadWriteCreateQueryBuilderMock).toHaveBeenCalledTimes(1);
    expect(repositoryReadWriteExecuteMock).toHaveBeenCalledTimes(1);
    expect(repositoryReadCreateQueryBuilderMock).not.toHaveBeenCalled();
    expect(repositoryReadExecuteMock).not.toHaveBeenCalled();
  });

  it('AccountWebPushDeviceService.updateLocaleForAccount writes on the read-write connection', async () => {
    const service = new AccountWebPushDeviceService();
    await service.updateLocaleForAccount(41, { locale: 'en-US' });

    expect(repositoryReadWriteCreateQueryBuilderMock).toHaveBeenCalledTimes(1);
    expect(repositoryReadWriteExecuteMock).toHaveBeenCalledTimes(1);
    expect(repositoryReadCreateQueryBuilderMock).not.toHaveBeenCalled();
    expect(repositoryReadExecuteMock).not.toHaveBeenCalled();
  });

  it('AccountUPDeviceService.updateLocaleForAccount writes on the read-write connection', async () => {
    const service = new AccountUPDeviceService();
    await service.updateLocaleForAccount(41, { locale: 'en-US' });

    expect(repositoryReadWriteCreateQueryBuilderMock).toHaveBeenCalledTimes(1);
    expect(repositoryReadWriteExecuteMock).toHaveBeenCalledTimes(1);
    expect(repositoryReadCreateQueryBuilderMock).not.toHaveBeenCalled();
    expect(repositoryReadExecuteMock).not.toHaveBeenCalled();
  });

  it('AccountUPDeviceService.deleteAllForAccount deletes on the read-write connection', async () => {
    const service = new AccountUPDeviceService();
    await service.deleteAllForAccount(41);

    expect(repositoryReadWriteCreateQueryBuilderMock).toHaveBeenCalledTimes(1);
    expect(repositoryReadWriteExecuteMock).toHaveBeenCalledTimes(1);
    expect(repositoryReadCreateQueryBuilderMock).not.toHaveBeenCalled();
    expect(repositoryReadExecuteMock).not.toHaveBeenCalled();
  });
});
