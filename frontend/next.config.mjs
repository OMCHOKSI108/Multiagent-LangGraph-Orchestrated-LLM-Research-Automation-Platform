/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    return [
      { source: '/api-proxy/:path*', destination: `${backendUrl}/:path*` },
    ];
  },
};

export default nextConfig;
