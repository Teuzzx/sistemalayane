import { FlatCompat } from "@eslint/eslintrc";

/**
 * Configuração de lint.
 *
 * `next/core-web-vitals` pega o que quebra em produção (uso errado de
 * `useEffect`, `<img>` sem dimensão, hook fora de ordem). As regras de
 * TypeScript ficam desligadas porque `npm run typecheck` já cobre isso —
 * duas ferramentas dando a mesma resposta só geram atrito.
 */
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "coverage/**",
      "next-env.d.ts",
      // Gerado pelo drizzle-kit, não é código revisado à mão.
      "src/db/migrations/**",
    ],
  },
  {
    rules: {
      // Variável que começa com `_` é declarada de propósito e não
      // usada — é o caso clássico de destructuring que descarta o
      // primeiro item. Erro aqui vira `void x` espalhado pelo código.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // O projeto usa `<a>` para links internos em alguns pontos e
      // `<Link>` em outros. Forçar uma das formas gera ruído sem
      // benefício funcional aqui, porque o layout é todo client-side.
      "@next/next/no-html-link-for-pages": "off",
    },
  },
];

export default config;
