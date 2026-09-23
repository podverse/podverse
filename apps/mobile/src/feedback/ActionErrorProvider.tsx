import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { PlaybackErrorEvent } from '../../modules/podverse-media-engine';
import { ConfirmDialog } from '../components/feedback/ConfirmDialog';
import {
  actionErrorDetailLine,
  downloadErrorMessageKeys,
  playbackErrorMessageKeys,
} from './actionErrorCopy';

type ActionErrorPresentation = {
  body: string;
  confirmLabel: string;
  title: string;
  visible: boolean;
};

export type ActionErrorContextValue = {
  openDownloadError: (reason: string | null, onConfirm: () => void) => void;
  openPlaybackError: (event: PlaybackErrorEvent | null, onConfirm: () => void) => void;
};

const ActionErrorContext = createContext<ActionErrorContextValue | undefined>(undefined);

const hiddenPresentation = (): ActionErrorPresentation => ({
  body: '',
  confirmLabel: '',
  title: '',
  visible: false,
});

/**
 * One app-wide explanation for a failed play or download. Hosts call `openPlaybackError` or
 * `openDownloadError` from the control the user tapped. The dialog does not open on its own.
 */
export function ActionErrorProvider({ children }: PropsWithChildren) {
  const { t } = useTranslation();
  const [presentation, setPresentation] = useState<ActionErrorPresentation>(hiddenPresentation);
  const onConfirmRef = useRef<() => void>(() => {});

  const openWithKeys = useCallback(
    (
      keys: { bodyKey: string; confirmLabelKey: string; titleKey: string },
      detail: string,
      onConfirm: () => void
    ) => {
      onConfirmRef.current = onConfirm;
      const explanation = t(keys.bodyKey);
      const body =
        detail.length > 0
          ? `${explanation}\n\n${t('action_error.report', { detail })}`
          : explanation;
      setPresentation({
        body,
        confirmLabel: t(keys.confirmLabelKey),
        title: t(keys.titleKey),
        visible: true,
      });
    },
    [t]
  );

  const openPlaybackError = useCallback(
    (event: PlaybackErrorEvent | null, onConfirm: () => void) => {
      const kind = event?.kind ?? 'unknown';
      openWithKeys(
        playbackErrorMessageKeys(kind),
        actionErrorDetailLine({
          code: event?.code ?? '',
          message: event?.message ?? '',
          reason: kind,
        }),
        onConfirm
      );
    },
    [openWithKeys]
  );

  const openDownloadError = useCallback(
    (reason: string | null, onConfirm: () => void) => {
      openWithKeys(
        downloadErrorMessageKeys(reason),
        actionErrorDetailLine({
          code: '',
          message: '',
          reason: reason ?? '',
        }),
        onConfirm
      );
    },
    [openWithKeys]
  );

  const close = useCallback(() => {
    setPresentation((current) => ({ ...current, visible: false }));
  }, []);

  const confirm = useCallback(() => {
    const action = onConfirmRef.current;
    setPresentation((current) => ({ ...current, visible: false }));
    action();
  }, []);

  const value = useMemo<ActionErrorContextValue>(
    () => ({ openDownloadError, openPlaybackError }),
    [openDownloadError, openPlaybackError]
  );

  return (
    <ActionErrorContext.Provider value={value}>
      {children}
      <ConfirmDialog
        body={presentation.body}
        cancelLabel={t('misc.cancel')}
        cancelTestID="action-error-cancel"
        confirmLabel={presentation.confirmLabel}
        confirmTestID="action-error-retry"
        onCancel={close}
        onConfirm={confirm}
        testID="action-error-dialog"
        title={presentation.title}
        visible={presentation.visible}
      />
    </ActionErrorContext.Provider>
  );
}

export const useActionError = (): ActionErrorContextValue => {
  const context = useContext(ActionErrorContext);
  if (context === undefined) {
    throw new Error('useActionError must be used within ActionErrorProvider');
  }
  return context;
};
