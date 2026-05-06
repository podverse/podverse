export const BUCKET_PROVIDERS = [
  'digitalocean',
  'aws-s3',
  'backblaze-b2',
  'garage',
  's3-compatible',
] as const;

export type BucketProvider = (typeof BUCKET_PROVIDERS)[number];

export const isBucketProvider = (value: string): value is BucketProvider => {
  return (BUCKET_PROVIDERS as readonly string[]).includes(value);
};
