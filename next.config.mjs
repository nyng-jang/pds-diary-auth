/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // 표가 없을 때 처음 한 번 적용할 SQL 파일을 서버 함수에 같이 싣는다
  outputFileTracingIncludes: { '/**': ['./db/**'] },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'same-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};
export default nextConfig;
