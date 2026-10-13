/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2592000, // 30 days
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/kitchen',
        destination: '/admin/orders',
        permanent: false,
      },
      {
        source: '/kitchen/orders',
        destination: '/admin/orders',
        permanent: false,
      },
      {
        source: '/kitchen/login',
        destination: '/admin/login',
        permanent: false,
      },
      {
        source: '/kitchen/:path*',
        destination: '/admin/orders',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
