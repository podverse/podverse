export const RATE_LIMIT_WINDOW_MS_BY_SUFFIX = {
  _PER_MINUTE: 60_000,
  _PER_10_MINUTES: 600_000,
  _PER_HOUR: 3_600_000,
  _PER_DAY: 86_400_000,
} as const;

export type RateLimitWindowSuffix = keyof typeof RATE_LIMIT_WINDOW_MS_BY_SUFFIX;

const RATE_LIMIT_WINDOW_SUFFIXES: RateLimitWindowSuffix[] = Object.keys(
  RATE_LIMIT_WINDOW_MS_BY_SUFFIX
) as RateLimitWindowSuffix[];

export const getRateLimitWindowSuffixFromKey = (key: string): RateLimitWindowSuffix | undefined => {
  for (const suffix of RATE_LIMIT_WINDOW_SUFFIXES) {
    if (key.endsWith(suffix)) {
      return suffix;
    }
  }
  return undefined;
};

const parseCount = (envValue: string | undefined | null, defaultMax: number): number => {
  if (envValue === undefined || envValue === null) {
    return defaultMax;
  }

  const trimmed = String(envValue).trim();
  if (trimmed === '') {
    return defaultMax;
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return defaultMax;
  }

  return parsed;
};

export const parseCountPerWindowEnv = ({
  envValue,
  suffix,
  defaultMax,
}: {
  envValue: string | undefined | null;
  suffix: RateLimitWindowSuffix;
  defaultMax: number;
}): { windowMs: number; max: number } => {
  return {
    windowMs: RATE_LIMIT_WINDOW_MS_BY_SUFFIX[suffix],
    max: parseCount(envValue, defaultMax),
  };
};

export const parseCountPerWindowEnvFromKey = ({
  envValue,
  key,
  defaultMax,
}: {
  envValue: string | undefined | null;
  key: string;
  defaultMax: number;
}): { suffix: RateLimitWindowSuffix; windowMs: number; max: number } => {
  const suffix = getRateLimitWindowSuffixFromKey(key);
  if (!suffix) {
    throw new Error(`Unsupported rate-limit env suffix for key: ${key}`);
  }

  const parsed = parseCountPerWindowEnv({
    envValue,
    suffix,
    defaultMax,
  });

  return {
    suffix,
    ...parsed,
  };
};
