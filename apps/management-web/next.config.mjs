import createNextIntlPlugin from 'next-intl/plugin';
import path from 'path';

const nextConfig = {
  async redirects() {
    // Legacy URLs: feature routes used to live under /dashboard/...
    return [
      { source: '/dashboard/admins', destination: '/admins', permanent: true },
      { source: '/dashboard/admins/:path*', destination: '/admins/:path*', permanent: true },
      { source: '/dashboard/database', destination: '/database', permanent: true },
      { source: '/dashboard/database/:path*', destination: '/database/:path*', permanent: true },
      { source: '/dashboard/workers', destination: '/workers', permanent: true },
    ];
  },
  output: 'standalone',
  outputFileTracingRoot: path.join(import.meta.dirname, '../../'),
  serverExternalPackages: [
    '@podverse/extension-metrics-sdk',
    '@opentelemetry/api',
    '@opentelemetry/exporter-metrics-otlp-http',
    '@opentelemetry/resources',
    '@opentelemetry/sdk-metrics',
    '@opentelemetry/semantic-conventions',
  ],
  sassOptions: {
    includePaths: [import.meta.dirname + '/src/styles/variables'],
  },
  transpilePackages: ['@podverse/helpers', '@podverse/ui', '@podverse/integrations-web'],
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
export default withNextIntl(nextConfig);
