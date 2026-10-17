import next from "eslint-config-next";

/**
 * Configuração de lint.
 *
 * `eslint-config-next` 16 já entrega flat config, então não se usa o
 * `FlatCompat` — passar o config novo pelo conversor do formato antigo
 * quebra com "Converting circular structure to JSON".
 *
 * Deliberadamente sem overrides: o preset já vem com `core-web-vitals`
 * (o que quebra em produção) e com as regras de TypeScript. Acrescentar
 * regra aqui exige declarar o plugin correspondente no mesmo objeto, e
 * foi exatamente aí que a primeira versão deste arquivo quebrou.
 */
const config = [
  ...next,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "coverage/**",
      "next-env.d.ts",
      // Gerado pelo drizzle-kit, revisado à mão não é.
      "src/db/migrations/**",
    ],
  },
];

export default config;
