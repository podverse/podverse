import { describe, expect, it } from 'vitest';

import { buildS3MiniEndpoint } from './buildS3MiniEndpoint.js';

describe('buildS3MiniEndpoint', () => {
  it('digitalocean virtual-hosted uses region template when endpoint omitted', () => {
    expect(
      buildS3MiniEndpoint({
        provider: 'digitalocean',
        bucket: 'my-space',
        region: 'nyc3',
        forcePathStyle: false,
      })
    ).toBe('https://my-space.nyc3.digitaloceanspaces.com');
  });

  it('digitalocean virtual-hosted respects custom regional base endpoint', () => {
    expect(
      buildS3MiniEndpoint({
        provider: 'digitalocean',
        bucket: 'my-space',
        region: 'nyc3',
        endpoint: 'https://nyc3.digitaloceanspaces.com',
        forcePathStyle: false,
      })
    ).toBe('https://my-space.nyc3.digitaloceanspaces.com');
  });

  it('aws-s3 virtual-hosted', () => {
    expect(
      buildS3MiniEndpoint({
        provider: 'aws-s3',
        bucket: 'b',
        region: 'us-east-1',
        forcePathStyle: false,
      })
    ).toBe('https://b.s3.us-east-1.amazonaws.com');
  });

  it('backblaze-b2 path-style uses region template', () => {
    expect(
      buildS3MiniEndpoint({
        provider: 'backblaze-b2',
        bucket: 'podverse-images',
        region: 'us-west-004',
        forcePathStyle: true,
      })
    ).toBe('https://s3.us-west-004.backblazeb2.com/podverse-images');
  });

  it('garage path-style requires endpoint', () => {
    expect(
      buildS3MiniEndpoint({
        provider: 'garage',
        bucket: 'images',
        region: 'garage',
        endpoint: 'https://garage.example.com',
        forcePathStyle: true,
      })
    ).toBe('https://garage.example.com/images');
  });

  it('garage virtual-hosted builds bucket subdomain from endpoint host', () => {
    expect(
      buildS3MiniEndpoint({
        provider: 'garage',
        bucket: 'images',
        region: 'garage',
        endpoint: 'https://s3.example.com',
        forcePathStyle: false,
      })
    ).toBe('https://images.s3.example.com');
  });

  it('throws when garage path-style has no endpoint', () => {
    expect(() =>
      buildS3MiniEndpoint({
        provider: 'garage',
        bucket: 'images',
        region: 'garage',
        forcePathStyle: true,
      })
    ).toThrow(/BUCKET_ENDPOINT is required/);
  });
});
