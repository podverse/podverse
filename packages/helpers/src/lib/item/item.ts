import { DATABASE_CONSTANTS } from '../constants/databaseConstants.js';

export const formatGuidEnclosureUrl = (url: string): string => {
  return url.slice(0, DATABASE_CONSTANTS.varchar_url);
};
