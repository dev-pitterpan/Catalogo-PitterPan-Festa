import type { NextConfig } from "next";
const config: NextConfig = {
  // Preserva os links públicos existentes com barra final.
  trailingSlash: true,
  poweredByHeader: false,
};
export default config;
