/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
  images: {
    // Для MVP разрешаем локальные изображения из /public
    formats: ['image/avif', 'image/webp'],
  },
};

module.exports = nextConfig;
