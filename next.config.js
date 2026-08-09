const { execFileSync } = require('node:child_process');

function immutableSiteReleaseSha() {
  const sha = execFileSync(
    'git',
    ['rev-parse', '--verify', 'HEAD^{commit}'],
    { encoding: 'utf8' },
  ).trim();
  if (!/^[a-f0-9]{40}$/.test(sha)) {
    throw new Error('SITE_RELEASE_SHA_INVALID');
  }
  const trackedChanges = execFileSync(
    'git',
    ['status', '--porcelain', '--untracked-files=no'],
    { encoding: 'utf8' },
  ).trim();
  if (trackedChanges) {
    throw new Error('SITE_RELEASE_BUILD_NOT_IMMUTABLE');
  }
  return sha;
}

const deployedSiteSha = immutableSiteReleaseSha();

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    ROSPARK_DEPLOYED_SITE_SHA: deployedSiteSha,
  },
  serverExternalPackages: ['better-sqlite3'],
  images: {
    // Для MVP разрешаем локальные изображения из /public
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    const privateHeaders = [
      { key: 'Cache-Control', value: 'no-store' },
      { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, nosnippet' },
    ];
    return [
      {
        source: '/hero-v2-20260805.mp4',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/hero-v2-20260805-poster.jpg',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      { source: '/admin/:path*', headers: privateHeaders },
      { source: '/api/admin/:path*', headers: privateHeaders },
    ];
  },
};

module.exports = nextConfig;
