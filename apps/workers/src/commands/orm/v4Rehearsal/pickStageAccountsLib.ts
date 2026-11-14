/**
 * Chooses v4 account ids for one stage and the rule that claimed each id.
 * Lists are already loaded. This module does not open a database, write a
 * file, or write a status row.
 */

export const REHEARSAL_V4_ID = 'eFv5NFx';

export const PILOT_TARGET = 100;

export const SAMPLE_TARGET = 1000;

export const ADD_BY_RSS_CAP_DEFAULT = 100;

export const DIRECTORY_FOLLOW_CAP_DEFAULT = 500;

export const PLAYLIST_RESOURCE_CAP = 10000;

export const LARGEST_QUERY_LIMIT = 8;

export const SQL_MATCH_LIMIT = 64;

export const JUST_OVER_LIMIT = 3;

export const TWIN_GROUP_LIMIT = 5;

export const UNVERIFIED_WITH_LISTS_LIMIT = 3;

export const UNVERIFIED_WITHOUT_LISTS_LIMIT = 2;

export const MEMBERSHIP_LIMIT = 5;

export const FOLLOWS_ACCOUNT_LIMIT = 5;

export const DEFAULT_PLAYLIST_LIMIT = 5;

export const NO_ACTIVITY_LIMIT = 5;

export type StageName = 'pilot' | 'sample' | 'full';

export type StagePickRule =
  | 'rehearsal'
  | 'largest_add_by_rss'
  | 'largest_subscriptions'
  | 'largest_clips'
  | 'largest_history'
  | 'largest_playlists'
  | 'largest_playlist_size'
  | 'just_over_add_by_rss'
  | 'just_over_directory_follows'
  | 'just_over_playlist_size'
  | 'email_case_twin'
  | 'paid'
  | 'trial'
  | 'expired'
  | 'unverified'
  | 'follows_account'
  | 'default_playlist'
  | 'no_activity'
  | 'random'
  | 'all';

export const PILOT_RULE_ORDER = [
  'rehearsal',
  'largest_add_by_rss',
  'largest_subscriptions',
  'largest_clips',
  'largest_history',
  'largest_playlists',
  'largest_playlist_size',
  'just_over_add_by_rss',
  'just_over_directory_follows',
  'just_over_playlist_size',
  'email_case_twin',
  'paid',
  'trial',
  'expired',
  'unverified',
  'follows_account',
  'default_playlist',
  'no_activity',
  'random',
] as const satisfies readonly Exclude<StagePickRule, 'all'>[];

type PilotRule = (typeof PILOT_RULE_ORDER)[number];

export type StageAccountPick = {
  v4Id: string;
  rule: StagePickRule;
};

export type PilotMatchLists = {
  rehearsal: readonly string[];
  largest_add_by_rss: readonly string[];
  largest_subscriptions: readonly string[];
  largest_clips: readonly string[];
  largest_history: readonly string[];
  largest_playlists: readonly string[];
  largest_playlist_size: readonly string[];
  just_over_add_by_rss: readonly string[];
  just_over_directory_follows: readonly string[];
  just_over_playlist_size: readonly string[];
  email_case_twin: readonly string[];
  paid_far: readonly string[];
  paid_soon: readonly string[];
  trial: readonly string[];
  expired: readonly string[];
  unverified_with_lists: readonly string[];
  unverified_without_lists: readonly string[];
  follows_account: readonly string[];
  default_playlist: readonly string[];
  no_activity: readonly string[];
};

export type AssembleStagePickInput =
  | { stage: 'pilot'; matches: PilotMatchLists; randomIds: readonly string[] }
  | { stage: 'sample'; randomIds: readonly string[] }
  | { stage: 'full'; fullIds: readonly string[] };

const UNREADABLE_ACCOUNTS = 'Could not read v4 accounts.';

function readAccountId(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(UNREADABLE_ACCOUNTS);
  }
  return value;
}

function takeSlot(
  ids: readonly string[],
  limit: number | null,
  rule: StagePickRule,
  taken: Set<string>,
  result: StageAccountPick[]
): void {
  let kept = 0;
  for (const value of ids) {
    if (limit !== null && kept >= limit) {
      return;
    }
    const id = readAccountId(value);
    if (taken.has(id)) {
      continue;
    }
    taken.add(id);
    result.push({ v4Id: id, rule });
    kept += 1;
  }
}

function takeRehearsal(
  ids: readonly string[],
  taken: Set<string>,
  result: StageAccountPick[]
): void {
  for (const value of ids) {
    const id = readAccountId(value);
    if (id !== REHEARSAL_V4_ID || taken.has(id)) {
      continue;
    }
    taken.add(id);
    result.push({ v4Id: id, rule: 'rehearsal' });
    return;
  }
}

function takeUnique(
  ids: readonly string[],
  rule: StagePickRule,
  limit: number | null
): StageAccountPick[] {
  const result: StageAccountPick[] = [];
  takeSlot(ids, limit, rule, new Set<string>(), result);
  return result;
}

function applyPilotRule(
  rule: PilotRule,
  matches: PilotMatchLists,
  randomIds: readonly string[],
  taken: Set<string>,
  result: StageAccountPick[]
): void {
  switch (rule) {
    case 'rehearsal':
      takeRehearsal(matches.rehearsal, taken, result);
      return;
    case 'largest_add_by_rss':
      takeSlot(matches.largest_add_by_rss, 1, rule, taken, result);
      return;
    case 'largest_subscriptions':
      takeSlot(matches.largest_subscriptions, 1, rule, taken, result);
      return;
    case 'largest_clips':
      takeSlot(matches.largest_clips, 1, rule, taken, result);
      return;
    case 'largest_history':
      takeSlot(matches.largest_history, 1, rule, taken, result);
      return;
    case 'largest_playlists':
      takeSlot(matches.largest_playlists, 1, rule, taken, result);
      return;
    case 'largest_playlist_size':
      takeSlot(matches.largest_playlist_size, 1, rule, taken, result);
      return;
    case 'just_over_add_by_rss':
      takeSlot(matches.just_over_add_by_rss, JUST_OVER_LIMIT, rule, taken, result);
      return;
    case 'just_over_directory_follows':
      takeSlot(matches.just_over_directory_follows, JUST_OVER_LIMIT, rule, taken, result);
      return;
    case 'just_over_playlist_size':
      takeSlot(matches.just_over_playlist_size, JUST_OVER_LIMIT, rule, taken, result);
      return;
    case 'email_case_twin':
      takeSlot(matches.email_case_twin, null, rule, taken, result);
      return;
    case 'paid':
      takeSlot([...matches.paid_far, ...matches.paid_soon], MEMBERSHIP_LIMIT, rule, taken, result);
      return;
    case 'trial':
      takeSlot(matches.trial, MEMBERSHIP_LIMIT, rule, taken, result);
      return;
    case 'expired':
      takeSlot(matches.expired, MEMBERSHIP_LIMIT, rule, taken, result);
      return;
    case 'unverified':
      takeSlot(matches.unverified_with_lists, UNVERIFIED_WITH_LISTS_LIMIT, rule, taken, result);
      takeSlot(
        matches.unverified_without_lists,
        UNVERIFIED_WITHOUT_LISTS_LIMIT,
        rule,
        taken,
        result
      );
      return;
    case 'follows_account':
      takeSlot(matches.follows_account, FOLLOWS_ACCOUNT_LIMIT, rule, taken, result);
      return;
    case 'default_playlist':
      takeSlot(matches.default_playlist, DEFAULT_PLAYLIST_LIMIT, rule, taken, result);
      return;
    case 'no_activity':
      takeSlot(matches.no_activity, NO_ACTIVITY_LIMIT, rule, taken, result);
      return;
    case 'random':
      if (result.length >= PILOT_TARGET) {
        return;
      }
      takeSlot(randomIds, PILOT_TARGET - result.length, rule, taken, result);
      return;
    default: {
      const unexpected: never = rule;
      throw new Error(UNREADABLE_ACCOUNTS, { cause: unexpected });
    }
  }
}

function assemblePilot(matches: PilotMatchLists, randomIds: readonly string[]): StageAccountPick[] {
  const taken = new Set<string>();
  const result: StageAccountPick[] = [];
  for (const rule of PILOT_RULE_ORDER) {
    applyPilotRule(rule, matches, randomIds, taken, result);
  }
  return result;
}

export function assembleStagePick(input: AssembleStagePickInput): StageAccountPick[] {
  if (input.stage === 'pilot') {
    return assemblePilot(input.matches, input.randomIds);
  }
  if (input.stage === 'sample') {
    return takeUnique(input.randomIds, 'random', SAMPLE_TARGET);
  }
  return takeUnique(input.fullIds, 'all', null);
}
