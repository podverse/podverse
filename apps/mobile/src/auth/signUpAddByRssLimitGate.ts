export type SignUpAddByRssLimitGate =
  | { kind: 'sign_up' }
  | { feedCount: number; kind: 'warn'; limit: number }
  | { kind: 'limit_unavailable' };

export const resolveSignUpAddByRssLimitGate = ({
  feedCount,
  limit,
}: {
  feedCount: number;
  limit: number | null;
}): SignUpAddByRssLimitGate => {
  if (feedCount === 0) {
    return { kind: 'sign_up' };
  }
  if (limit === null) {
    return { kind: 'limit_unavailable' };
  }
  return feedCount > limit ? { feedCount, kind: 'warn', limit } : { kind: 'sign_up' };
};
