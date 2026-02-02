const nextConfig = {
  output: 'export', // Vital: Outputs static HTML to 'out' folder
  trailingSlash: true, // Vital: Creates folder structure (e.g. /expenses/index.html) for better hosting compatibility
  images: {
    unoptimized: true, // Required for static export
  },
};

export default nextConfig;