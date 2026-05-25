/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Allow external tunnel domains (ngrok, etc.) in dev mode
  allowedDevOrigins: [
    '*.ngrok-free.dev',
    '*.ngrok-free.app',
    '*.ngrok.io',
    '*.ngrok.app',
    '*.loca.lt',
    '*.trycloudflare.com',
  ],
}

export default nextConfig
