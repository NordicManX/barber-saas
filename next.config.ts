import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {}, // adiciona esta linha para silenciar o aviso
};

export default nextConfig;
