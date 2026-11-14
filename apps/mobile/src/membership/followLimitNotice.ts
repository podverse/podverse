type FollowLimitListener = (limit: number) => void;

let listener: FollowLimitListener | null = null;

/** The membership gate shows the follow-tier sentence. Login sits outside that provider. */
export function subscribeFollowLimit(next: FollowLimitListener): () => void {
  listener = next;
  return () => {
    if (listener === next) {
      listener = null;
    }
  };
}

export function publishFollowLimit(limit: number): void {
  listener?.(limit);
}
