import BigNumber from 'bignumber.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function calculateExactRangePositions(value: string): { position1: any; position2: any } {
  const increment = new BigNumber('0.000000000000000000001');
  const numValue = new BigNumber(value);

  const position1 = numValue.minus(increment).toFixed(21);
  const position2 = numValue.plus(increment).toFixed(21);

  return {
    position1,
    position2,
  };
}
