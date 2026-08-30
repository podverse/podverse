import { createRequire } from 'node:module';

import withBundleAnalyzerInit from '@next/bundle-analyzer';
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'path';
import webpack from 'webpack';

import { DATE_FNS_LOCALE_IDS } from '@podverse/helpers';

const resolve = createRequire(import.meta.url).resolve;

const withBundleAnalyzer = withBundleAnalyzerInit({
  enabled: process.env.ANALYZE === 'true',
  analyzerMode: 'static',
  openAnalyzer: false,
});

const nextConfig = {
  devIndicators: false,
  logging: {
    incomingRequests: {
      /** Avoid dev-terminal spam from Next/Image + `/api/proxy` when upstream artwork fails (403/404). */
      ignore: [/^\/api\/proxy/],
    },
  },
  async redirects() {
    return [
      {
        source: '/v4v/boost-messages',
        destination: '/v4v/metaboost',
        permanent: true,
      },
    ];
  },
  output: 'standalone',
  outputFileTracingRoot: path.join(import.meta.dirname, '../../'),
  sassOptions: {
    implementation: resolve('sass'),
  },
  serverExternalPackages: [
    'winston',
    '@podverse/extension-metrics-sdk',
    '@opentelemetry/api',
    '@opentelemetry/exporter-metrics-otlp-http',
    '@opentelemetry/resources',
    '@opentelemetry/sdk-metrics',
    '@opentelemetry/semantic-conventions',
  ],
  transpilePackages: ['@podverse/helpers', '@podverse/ui', '@podverse/integrations-web'],
  // Turbopack config for development (Next.js 16 default bundler)
  turbopack: {
    resolveAlias: {
      fs: { browser: './turbopack-empty.ts' },
      net: { browser: './turbopack-empty.ts' },
      tls: { browser: './turbopack-empty.ts' },
      dgram: { browser: './turbopack-empty.ts' },
    },
  },
  // Webpack config for production builds
  webpack: (config, { isServer }) => {
    // Restrict date-fns/locale to SUPPORTED_LOCALES only (en-US, es, fr, el)
    config.plugins = config.plugins ?? [];
    config.plugins.push(
      new webpack.ContextReplacementPlugin(
        /date-fns[/\\]locale/,
        new RegExp(`(${[...DATE_FNS_LOCALE_IDS].join('|')})`)
      )
    );
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
    minimumCacheTTL: 86400,
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
