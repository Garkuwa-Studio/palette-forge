import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // The package ships as ESM with an exports map, so Next can consume it
  // directly. Listing it here keeps workspace source changes hot-reloading in
  // dev without a rebuild of the package.
  transpilePackages: ["palette-forge"],
};

export default config;
