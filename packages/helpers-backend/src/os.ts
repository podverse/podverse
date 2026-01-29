/* eslint-disable @typescript-eslint/no-explicit-any */
import os from 'os';

/**
 * Return the container IP portion for use in IDs.
 * Produces a string like "_192-168-0-5" or an empty string when none found.
 */
export function getContainerIpPart(): string {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    const addrs = nets[name];
    if (!addrs) {
      continue;
    }
    for (const addr of addrs) {
      if (!addr) {
        continue;
      }
      const family = (addr as any).family;
      const isIpv4 =
        (typeof family === 'string' && family.toLowerCase() === 'ipv4') || family === 4;
      if (isIpv4 && !(addr as any).internal && (addr as any).address) {
        return `_${(addr as any).address.replace(/\./g, '-')}`;
      }
    }
  }
  return '';
}
