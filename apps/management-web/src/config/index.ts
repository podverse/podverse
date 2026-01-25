/* eslint-disable @typescript-eslint/no-non-null-assertion -- env vars validated at build time in scripts/validate-env.ts */

export const config = {
  public: {
    brand: {
      name: process.env.NEXT_PUBLIC_BRAND_NAME,
    },
    api: {
      client: {
        protocol: process.env.NEXT_PUBLIC_API_PROTOCOL,
        host: process.env.NEXT_PUBLIC_API_HOST,
        port: process.env.NEXT_PUBLIC_API_PORT,
      },
      prefix: process.env.NEXT_PUBLIC_API_PREFIX,
      version: process.env.NEXT_PUBLIC_API_VERSION,
    },
  },
};
