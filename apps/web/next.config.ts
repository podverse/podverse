import path from 'path';

import withBundleAnalyzerInit from '@next/bundle-analyzer';
import { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withBundleAnalyzer = withBundleAnalyzerInit({
  enabled: process.env.ANALYZE === 'true',
  analyzerMode: 'static',
  openAnalyzer: false,
});

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(import.meta.dirname, '../../'),
  serverExternalPackages: ['winston'],
  transpilePackages: ['@podverse/helpers'],
  // Turbopack config for development (Next.js 16 default bundler)
  turbopack: {
    resolveAlias: {
      fs: { browser: './turbopack-empty.ts' },
      net: { browser: './turbopack-empty.ts' },
      tls: { browser: './turbopack-empty.ts' },
      dgram: { browser: './turbopack-empty.ts' },
    },
  },
  // Webpack config for production builds (using --webpack flag)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Polyfill or ignore Node.js modules for client-side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dgram: false,
      };
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
    localPatterns: [
      {
        pathname: '/api/proxy',
      },
      {
        pathname: '/branding/**',
      },
      {
        pathname: '/images/**',
      },
    ],
  },
};

const withNextIntl = createNextIntlPlugin();

export default withBundleAnalyzer(withNextIntl(nextConfig));
