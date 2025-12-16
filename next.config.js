/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Для MVP разрешаем локальные изображения из /public
    formats: ['image/avif', 'image/webp'],
  },
};

module.exports = nextConfig;
