import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // libSQL carrega binding nativo — deixa fora do bundle do server components.
  serverExternalPackages: ["@libsql/client", "bcryptjs"],
  // O `next dev` regenera AGENTS.md/CLAUDE.md a cada boot; esse projeto
  // não usa esses arquivos e eles sujam o diff.
  agentRules: false,
  // O Turbopack deste repositório resolve a raiz no repo git (`NORION`),
  // que está um nível acima — isso quebra os path dos route groups.
  // O dev roda em webpack por isso (ver `npm run dev`).
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;