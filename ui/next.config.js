// const nextConfig = {
//   experimental: {
//     appDir: true, // This is fine for app directory structure, but if you use "pages" directory, you can remove this
//   },
//   output: "export",
// };

// module.exports = nextConfig;

const withPWA = require("next-pwa");

const nextConfig = {
  experimental: {
    appDir: true,
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });

    return config;
  },
  output: "export",
};

module.exports = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  // Add any additional Workbox configuration here
})(nextConfig);
