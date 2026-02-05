import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  redirects: async () => {
    return [
      {
        source: '/contracts/:id/documents',
        destination: '/contracts/:id/explorer',
        permanent: false,
      },
      {
        source: '/contracts/:id/validation',
        destination: '/contracts/:id/overview',
        permanent: false,
      },
      {
        source: '/contracts/:id/resolution',
        destination: '/contracts/:id/triage',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
