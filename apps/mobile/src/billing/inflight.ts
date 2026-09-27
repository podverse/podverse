export const createInflightGate = <T>() => {
  const inflight = new Map<string, Promise<T>>();
  return (key: string, run: () => Promise<T>): Promise<T> => {
    const existing = inflight.get(key);
    if (existing !== undefined) {
      return existing;
    }
    const promise = run().finally(() => {
      inflight.delete(key);
    });
    inflight.set(key, promise);
    return promise;
  };
};

/** Runs `finish` once per id. A later call is a no-op after a successful finish. */
export const createFinishOnce = () => {
  const finished = new Set<string>();
  const gate = createInflightGate<void>();
  return (id: string, finish: () => Promise<void>): Promise<void> => {
    if (finished.has(id)) {
      return Promise.resolve();
    }
    return gate(id, async () => {
      if (finished.has(id)) {
        return;
      }
      await finish();
      finished.add(id);
    });
  };
};
