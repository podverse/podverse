import { subtractDays } from './date.js';

/** How far back an account's on-demand parse requests are counted when rate limiting a new one. */
export const ON_DEMAND_PARSER_EVENT_WINDOW_DAYS = 30;

export const getOnDemandParserEventDateRange = () =>
  subtractDays(new Date(), ON_DEMAND_PARSER_EVENT_WINDOW_DAYS);
