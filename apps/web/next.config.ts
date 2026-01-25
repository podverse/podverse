import { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  output: 'standalone',
  sassOptions: {
    includePaths: [__dirname + '/src/styles/variables']
  },
  serverExternalPackages: ['winston'],
  transpilePackages: ['@podverse/helpers'],
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
        pathname: '/api/proxy'
      },
      {
        pathname: '/branding/**'
      },
      {
        pathname: '/images/**'
      }
    ]
  }
};

const withNextIntl = createNextIntlPlugin();

// Conditionally add bundle analyzer when ANALYZE env var is set
let config = withNextIntl(nextConfig);
if (process.env.ANALYZE === 'true') {
  const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: true,
    analyzerMode: 'static',
    openAnalyzer: false,
    generateStatsFile: true,
    statsFilename: ({ name }: { name: string }) => `stats-${name}.json`,
    reportFilename: ({ name }: { name: string }) => `${name}.html`,
  });
  config = withBundleAnalyzer(config);
}

export default config;