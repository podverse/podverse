import path from 'path';

import createNextIntlPlugin from 'next-intl/plugin';

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
  sassOptions: {
    includePaths: [import.meta.dirname + '/src/styles/variables'],
  },
  transpilePackages: ['@podverse/helpers'],
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
