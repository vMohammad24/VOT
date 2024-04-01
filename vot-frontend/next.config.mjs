/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ hostname: "*.discordapp.com" }],
  },
};

export default nextConfig;
