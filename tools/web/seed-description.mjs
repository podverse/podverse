import { DescriptionLengthTierEnum, prepareDescriptionForStorage } from '@podverse/helpers';

export function seedDescriptionForStorage(value) {
  const prepared = prepareDescriptionForStorage(value, DescriptionLengthTierEnum.Standard);
  if (prepared === null) {
    throw new Error('Seed description is empty');
  }
  return prepared;
}
