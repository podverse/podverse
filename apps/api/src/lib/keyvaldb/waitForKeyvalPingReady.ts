import { testKeyvaldbConnection } from './keyvaldb.js';

const KEYVAL_STARTUP_MAX_WAIT_MS = 120_000;
const KEYVAL_RETRY_INTERVAL_MS = 2000;

/** Bounded retry loop until KeyVal responds to PING or deadline (startup gate before HTTP listen). */
export async function waitForKeyvalPingReady(): Promise<boolean> {
  const deadline = Date.now() + KEYVAL_STARTUP_MAX_WAIT_MS;
  while (Date.now() < deadline) {
    if (await testKeyvaldbConnection(false)) {
      return true;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, KEYVAL_RETRY_INTERVAL_MS));
  }
  return testKeyvaldbConnection(true);
}
