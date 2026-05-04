import { beforeEach, describe, expect, it, vi } from 'vitest';

const findOneMock = vi.fn();
const saveMock = vi.fn();

vi.mock('@orm/context.js', () => ({
  getDataSourceRead: () => ({
    getRepository: () => ({
      findOne: findOneMock,
    }),
  }),
  getDataSourceReadWrite: () => ({
    getRepository: () => ({
      findOne: findOneMock,
      save: saveMock,
      query: vi.fn(),
    }),
  }),
}));

import { ImageShrinkSourceService } from './imageShrinkSource.js';

describe('ImageShrinkSourceService.shouldDeepRecheck', () => {
  beforeEach(() => {
    findOneMock.mockReset();
  });

  it('returns false when interval is not positive', async () => {
    const svc = new ImageShrinkSourceService();
    findOneMock.mockResolvedValue({
      lastDeepCheckedAt: null,
    });
    expect(await svc.shouldDeepRecheck('https://example.com/a.png', 0)).toBe(false);
  });

  it('returns false when no source row exists', async () => {
    const svc = new ImageShrinkSourceService();
    findOneMock.mockResolvedValue(null);
    expect(await svc.shouldDeepRecheck('https://example.com/a.png', 3600)).toBe(false);
  });

  it('returns true when last_deep_checked_at is null', async () => {
    const svc = new ImageShrinkSourceService();
    findOneMock.mockResolvedValue({
      lastDeepCheckedAt: null,
    });
    expect(await svc.shouldDeepRecheck('https://example.com/a.png', 3600)).toBe(true);
  });

  it('returns true when last deep check is older than interval', async () => {
    const svc = new ImageShrinkSourceService();
    const old = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    findOneMock.mockResolvedValue({
      lastDeepCheckedAt: old,
    });
    expect(await svc.shouldDeepRecheck('https://example.com/a.png', 7 * 24 * 60 * 60)).toBe(true);
  });

  it('returns false when last deep check is within interval', async () => {
    const svc = new ImageShrinkSourceService();
    const recent = new Date(Date.now() - 24 * 60 * 60 * 1000);
    findOneMock.mockResolvedValue({
      lastDeepCheckedAt: recent,
    });
    expect(await svc.shouldDeepRecheck('https://example.com/a.png', 7 * 24 * 60 * 60)).toBe(false);
  });
});

describe('ImageShrinkSourceService.upsert', () => {
  beforeEach(() => {
    findOneMock.mockReset();
    saveMock.mockReset();
  });

  it('sets lastDeepCheckedAt when markDeepCheckComplete is true', async () => {
    const svc = new ImageShrinkSourceService();
    findOneMock.mockResolvedValue(null);
    saveMock.mockImplementation((row: { lastDeepCheckedAt?: Date | null }) => row);

    await svc.upsert('https://example.com/a.png', { etag: '"x"' }, false, 'deadbeef', {
      markDeepCheckComplete: true,
    });

    expect(saveMock).toHaveBeenCalledTimes(1);
    const firstCall = saveMock.mock.calls[0];
    if (firstCall === undefined) {
      throw new Error('expected saveMock to have been called');
    }
    const saved = firstCall[0] as { lastDeepCheckedAt?: Date | null };
    expect(saved.lastDeepCheckedAt).toBeInstanceOf(Date);
  });

  it('does not set lastDeepCheckedAt when markDeepCheckComplete is omitted', async () => {
    const svc = new ImageShrinkSourceService();
    findOneMock.mockResolvedValue(null);
    saveMock.mockImplementation((row: { lastDeepCheckedAt?: Date | null }) => row);

    await svc.upsert('https://example.com/a.png', { etag: '"x"' }, false, 'deadbeef', {});

    const firstCall = saveMock.mock.calls[0];
    if (firstCall === undefined) {
      throw new Error('expected saveMock to have been called');
    }
    const saved = firstCall[0] as { lastDeepCheckedAt?: Date | null };
    expect(saved.lastDeepCheckedAt).toBeUndefined();
  });
});
