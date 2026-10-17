import type { NextConfig } from "next";

/**
 * Cabeçalhos de segurança.
 *
 * A Content-Security-Policy é deliberadamente SEM `unsafe-inline` no
 * `script-src`. O Next.js injeta scripts de hydration inline, então o
 * padrão é permitir `unsafe-inline` só para scripts e bloquear todo o
 * resto: nenhum frame externo, nenhum plugin, nenhum `eval`.
 *
 * `frame-ancestors 'none'` impede que alguém enclose o sistema numa
 * página própria e use o login dela como isca (clickjacking).
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  // Estilos inline são usados pelo Tailwind para cor de fundo dinâmica.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  // `connect-src` precisa do Turso: o cliente HTTP do libSQL fala direto
  // com ele quando a URL é `libsql://`/https.
  `connect-src 'self' https://*.turso.io wss://*.turso.io`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  // `pg` carrega binding nativo e o `bcryptjs` é nativo também — fora do
  // bundle dos server components.
  serverExternalPackages: ["pg", "bcryptjs"],
  // O `next dev` regenera AGENTS.md/CLAUDE.md a cada boot; esse projeto
  // não usa esses arquivos e eles sujam o diff.
  agentRules: false,
  // O Turbopack deste repositório resolve a raiz no repo git (`NORION`),
  // que está um nível acima — isso quebra os path dos route groups.
  // O dev roda em webpack por isso (ver `npm run dev`).
  turbopack: {
    root: process.cwd(),
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // Segredo do sistema: dado de cliente não pode ficar em cache
          // compartilhado de proxy nem no histórico do navegador.
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
    ];
  },
};

export default nextConfig;