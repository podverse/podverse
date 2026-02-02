import type { ActiveMQArtemisService } from '@podverse/mq';

let instance: ActiveMQArtemisService | null = null;

export function setActiveMQArtemisService(service: ActiveMQArtemisService): void {
  instance = service;
}

export function getActiveMQArtemisService(): ActiveMQArtemisService {
  if (instance === null) {
    throw new Error(
      'ActiveMQArtemisService not initialized; call setActiveMQArtemisService from runApp first'
    );
  }
  return instance;
}
