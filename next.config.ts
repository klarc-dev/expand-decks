import { withPayload } from '@payloadcms/next/withPayload';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/admin/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            // cdn.jsdelivr.net + blob: workers are required by the Monaco
            // editor that Payload's code fields lazy-load from the CDN.
            value:
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; worker-src 'self' blob:;",
          },
        ],
      },
    ];
  },
};

export default withPayload(nextConfig);
