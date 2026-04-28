import BigNumber from 'bignumber.js';

// bignumber.js v11+ defaults to STRICT: invalid strings throw. Catch and rethrow for a stable error shape.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function calculateExactRangePositions(value: string): { position1: any; position2: any } {
  const increment = new BigNumber('0.000000000000000000001');
  let numValue: BigNumber;
  try {
    numValue = new BigNumber(value);
  } catch {
    throw new Error(`Invalid value for exact range position: ${value}`);
  }

  const position1 = numValue.minus(increment).toFixed(21);
  const position2 = numValue.plus(increment).toFixed(21);

  return {
    position1,
    position2,
  };
}
