import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack(config) {
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      {
        module: /@auth0[\\/]nextjs-auth0[\\/]dist[\\/]utils[\\/]dpopUtils\.js/,
        message: /Critical dependency: the request of a dependency is an expression/,
      },
      {
        module: /jose[\\/]dist[\\/]webapi[\\/]lib[\\/]deflate\.js/,
        message: /A Node\.js API is used \((?:CompressionStream|DecompressionStream) at line: (?:10|26)\) which is not supported in the Edge Runtime/,
      },
    ];

    return config;
  },
};

export default nextConfig;
