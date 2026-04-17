/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const normalizeApiBase = (baseUrl) => {
      const trimmed = String(baseUrl || '').replace(/\/+$/, '');
      return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
    };

    // `NEXT_PUBLIC_API_URL` should point at the Node backend base.
    // In docker-compose dev, backend is exposed on http://localhost:5001 (container:5000).
    const apiBase = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001');
    return [
      { source: '/api-proxy/:path*', destination: `${apiBase}/:path*` },
    ];
  },
};

export default nextConfig;
