const nextConfig = {
  output: 'export', // Vital: Outputs static HTML to 'out' folder
  images: {
    unoptimized: true, // Required for static export
  },
};

export default nextConfig;