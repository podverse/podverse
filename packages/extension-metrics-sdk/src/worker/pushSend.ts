import type { Counter, Meter } from '@opentelemetry/api';

export const PUSH_SEND_TOTAL = 'podverse_push_send_total';

export type PushSendCodeClass = 'dead_token' | 'transient' | 'payload_or_auth';

export type PushSendInstruments = {
  sendTotal: Counter;
};

export type PushSendRecord = {
  service: string;
  platform: string | null;
  accepted: number;
  failedByClass: Record<PushSendCodeClass, number>;
};

const CODE_CLASSES: PushSendCodeClass[] = ['dead_token', 'transient', 'payload_or_auth'];

export function createPushSendInstruments(meter: Meter): PushSendInstruments {
  return {
    sendTotal: meter.createCounter(PUSH_SEND_TOTAL, {
      description: 'Push send attempts grouped by outcome and error class',
    }),
  };
}

export function recordPushSendMetric(
  instruments: PushSendInstruments,
  input: PushSendRecord
): void {
  const attributes = {
    service: input.service,
    platform: input.platform ?? 'none',
  };
  if (input.accepted > 0) {
    instruments.sendTotal.add(input.accepted, {
      ...attributes,
      outcome: 'accepted',
      code_class: 'none',
    });
  }
  for (const codeClass of CODE_CLASSES) {
    const count = input.failedByClass[codeClass];
    if (count > 0) {
      instruments.sendTotal.add(count, {
        ...attributes,
        outcome: 'failed',
        code_class: codeClass,
      });
    }
  }
}
