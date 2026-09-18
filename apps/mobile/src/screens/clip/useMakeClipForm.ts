import { useCallback, useEffect, useMemo, useState } from 'react';

import { SharableStatusEnum } from '@podverse/helpers';
import type { DTOChannel, DTOClip, DTOItem } from '@podverse/helpers';
import type { PlaybackTarget } from '@podverse/playback-core';

import { useAuth } from '../../auth';
import { clipRepository } from '../../data/repositories/clipRepository';
import type { ClipVisibility } from '../../prefs/clipPrefs';
import { readClipVisibilityPref, writeClipVisibilityPref } from '../../prefs/clipPrefs';
import { usePlayback } from '../../playback/PlaybackProvider';
import type { MakeClipValidationReason } from './makeClipValidation';
import { validateMakeClipForm } from './makeClipValidation';

type CurrentClipResource = {
  channel: DTOChannel;
  item: DTOItem;
};

type MakeClipRouteParams = { mode: 'create' } | { mode: 'edit'; clipId: string };

export type SaveClipResult =
  | { ok: true; clip: DTOClip }
  | { ok: false; reason: 'missing_item' | 'not_authenticated' }
  | { ok: false; reason: 'request_error'; error: unknown }
  | { ok: false; reason: 'validation'; validationReason: MakeClipValidationReason };

export type DeleteClipResult =
  | { ok: true }
  | { ok: false; reason: 'missing_clip' | 'not_authenticated' }
  | { ok: false; reason: 'request_error'; error: unknown };

type UseMakeClipFormResult = {
  captureEndTime: () => void;
  captureStartTime: () => void;
  clearEndTime: () => void;
  currentResource: CurrentClipResource | null;
  endSeconds: number | null;
  isLoading: boolean;
  isSaving: boolean;
  loadedClip: DTOClip | null;
  deleteClip: () => Promise<DeleteClipResult>;
  saveClip: () => Promise<SaveClipResult>;
  setTitle: (value: string) => void;
  setVisibility: (value: ClipVisibility) => void;
  startSeconds: number | null;
  title: string;
  visibility: ClipVisibility;
};

const parseMaybeSeconds = (value: string | null | undefined): number | null => {
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.max(0, Math.floor(parsed));
};

const currentResourceFromTarget = (target: PlaybackTarget | null): CurrentClipResource | null => {
  if (target === null || target.kind === 'add-by-rss') {
    return null;
  }

  const item = target.item;
  const channel = target.channel;
  return item !== null && item !== undefined && channel !== null && channel !== undefined
    ? { item, channel }
    : null;
};

export const useMakeClipForm = (params: MakeClipRouteParams): UseMakeClipFormResult => {
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const { activeTarget, durationSeconds, positionSeconds } = usePlayback();
  const [title, setTitle] = useState<string>('');
  const [startSeconds, setStartSeconds] = useState<number | null>(null);
  const [endSeconds, setEndSeconds] = useState<number | null>(null);
  const [visibility, setVisibilityState] = useState<ClipVisibility>(SharableStatusEnum.Private);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(params.mode === 'edit');
  const [loadedClip, setLoadedClip] = useState<DTOClip | null>(null);

  const authContext = useMemo(
    () => ({ accessToken, clearSession, refreshToken, setTokens }),
    [accessToken, clearSession, refreshToken, setTokens]
  );

  const mode = params.mode;
  const editClipId = params.mode === 'edit' ? params.clipId : null;

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (mode === 'create') {
        const storedVisibility = await readClipVisibilityPref();
        if (!cancelled) {
          setVisibilityState(storedVisibility);
        }
        setIsLoading(false);
        return;
      }

      try {
        if (editClipId === null) {
          return;
        }
        const clip = await clipRepository.getByIdText(authContext, editClipId);
        if (cancelled) {
          return;
        }
        setLoadedClip(clip);
        setTitle(clip.title ?? '');
        setStartSeconds(parseMaybeSeconds(clip.start_time));
        setEndSeconds(parseMaybeSeconds(clip.end_time ?? null));
        setVisibilityState(clipRepository.toVisibility(clip));
      } catch {
        if (!cancelled) {
          setLoadedClip(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authContext, editClipId, mode]);

  const currentResource = useMemo(() => currentResourceFromTarget(activeTarget), [activeTarget]);

  const setVisibility = useCallback((nextVisibility: ClipVisibility) => {
    setVisibilityState(nextVisibility);
    void writeClipVisibilityPref(nextVisibility);
  }, []);

  const captureStartTime = useCallback(() => {
    setStartSeconds(Math.max(0, Math.floor(positionSeconds)));
  }, [positionSeconds]);

  const captureEndTime = useCallback(() => {
    setEndSeconds(Math.max(0, Math.floor(positionSeconds)));
  }, [positionSeconds]);

  const clearEndTime = useCallback(() => {
    setEndSeconds(null);
  }, []);

  const saveClip = useCallback(async (): Promise<SaveClipResult> => {
    if (status !== 'authenticated') {
      return { ok: false, reason: 'not_authenticated' };
    }
    if (currentResource === null) {
      return { ok: false, reason: 'missing_item' };
    }

    const validated = validateMakeClipForm({
      durationSeconds,
      endSeconds,
      startSeconds,
      title,
      visibility,
    });
    if (!validated.ok) {
      return { ok: false, reason: 'validation', validationReason: validated.reason };
    }

    setIsSaving(true);
    try {
      const payload = {
        endTimeSeconds: validated.value.endSeconds,
        itemIdText: currentResource.item.id_text,
        startTimeSeconds: validated.value.startSeconds,
        title: validated.value.title,
        visibility: validated.value.visibility,
      };

      const clip =
        mode === 'edit' && editClipId !== null
          ? await clipRepository.update(authContext, { ...payload, clipIdText: editClipId })
          : await clipRepository.create(authContext, payload);
      return { clip, ok: true };
    } catch (error) {
      return { error, ok: false, reason: 'request_error' };
    } finally {
      setIsSaving(false);
    }
  }, [
    authContext,
    currentResource,
    durationSeconds,
    editClipId,
    endSeconds,
    mode,
    startSeconds,
    status,
    title,
    visibility,
  ]);

  const deleteClip = useCallback(async (): Promise<DeleteClipResult> => {
    if (status !== 'authenticated') {
      return { ok: false, reason: 'not_authenticated' };
    }
    if (mode !== 'edit' || editClipId === null) {
      return { ok: false, reason: 'missing_clip' };
    }

    setIsSaving(true);
    try {
      await clipRepository.delete(authContext, editClipId);
      return { ok: true };
    } catch (error) {
      return { error, ok: false, reason: 'request_error' };
    } finally {
      setIsSaving(false);
    }
  }, [authContext, editClipId, mode, status]);

  return {
    captureEndTime,
    captureStartTime,
    clearEndTime,
    currentResource,
    endSeconds,
    isLoading,
    isSaving,
    loadedClip,
    deleteClip,
    saveClip,
    setTitle,
    setVisibility,
    startSeconds,
    title,
    visibility,
  };
};
