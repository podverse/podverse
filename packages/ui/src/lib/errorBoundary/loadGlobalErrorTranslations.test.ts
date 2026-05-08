import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_GLOBAL_ERROR_FALLBACK_ERRORS,
  DEFAULT_GLOBAL_ERROR_FALLBACK_MISC,
  loadGlobalErrorTranslations,
} from './loadGlobalErrorTranslations';

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = '';
});

describe('loadGlobalErrorTranslations', () => {
  it('loads messages for cookie locale', async () => {
    document.cookie = 'NEXT_LOCALE=es';

    const loadMessages = vi.fn().mockResolvedValue({
      default: {
        errors: { global_title: 'Título', global_message: 'Mensaje' },
        misc: { try_again: 'Reintentar', reload_page: 'Recargar' },
      },
    });
    const loadFallback = vi.fn();

    const result = await loadGlobalErrorTranslations({
      loadMessages,
      loadFallback,
      fallbackErrors: DEFAULT_GLOBAL_ERROR_FALLBACK_ERRORS,
      fallbackMisc: DEFAULT_GLOBAL_ERROR_FALLBACK_MISC,
    });

    expect(loadMessages).toHaveBeenCalledWith('es');
    expect(loadFallback).not.toHaveBeenCalled();
    expect(result.errors.global_title).toBe('Título');
    expect(result.misc.try_again).toBe('Reintentar');
  });

  it('falls back to loadFallback when primary import fails', async () => {
    document.cookie = '';

    const loadMessages = vi.fn().mockRejectedValue(new Error('missing'));
    const loadFallback = vi.fn().mockResolvedValue({
      default: {
        errors: { global_title: 'En title' },
        misc: { try_again: 'Try' },
      },
    });

    const result = await loadGlobalErrorTranslations({
      loadMessages,
      loadFallback,
      fallbackErrors: DEFAULT_GLOBAL_ERROR_FALLBACK_ERRORS,
      fallbackMisc: DEFAULT_GLOBAL_ERROR_FALLBACK_MISC,
    });

    expect(loadFallback).toHaveBeenCalled();
    expect(result.errors.global_title).toBe('En title');
  });

  it('returns passed fallbacks when both imports fail', async () => {
    const loadMessages = vi.fn().mockRejectedValue(new Error('a'));
    const loadFallback = vi.fn().mockRejectedValue(new Error('b'));

    const result = await loadGlobalErrorTranslations({
      loadMessages,
      loadFallback,
      fallbackErrors: DEFAULT_GLOBAL_ERROR_FALLBACK_ERRORS,
      fallbackMisc: DEFAULT_GLOBAL_ERROR_FALLBACK_MISC,
    });

    expect(result.errors.global_title).toBe(DEFAULT_GLOBAL_ERROR_FALLBACK_ERRORS.global_title);
    expect(result.misc.try_again).toBe(DEFAULT_GLOBAL_ERROR_FALLBACK_MISC.try_again);
  });
});
