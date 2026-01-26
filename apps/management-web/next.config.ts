import path from 'path';

import { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
  sassOptions: {
    includePaths: [__dirname + '/src/styles/variables']
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
export default withNextIntl(nextConfig);
