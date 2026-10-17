import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    /*
     * Os testes ficam em `src/lib/__testes__`, ao lado do código, e não
     * numa pasta `tests/` separada. Motivo prático: quando alguém abre
     * `money.ts` para mudar uma regra, os testes estão a duas teclas de
     * distância, não do outro lado da árvore.
     */
    include: ["src/**/__testes__/**/*.test.ts"],
    environment: "node",

    /*
     * Cobertura só nos módulos de regra pura — dinheiro, data,
     * comercial, conformidade, senha, e-mail.
     *
     * Não incluo componentes React nem actions de servidor: exigir
     * cobertura ali vira um número que ninguém olha, e o primeiro lugar
     * onde esse número cai é o lugar onde alguém começa a escrever teste
     * pra alimentar métrica em vez de pegar defeito.
     */
    coverage: {
      provider: "v8",
      include: [
        "src/lib/money.ts",
        "src/lib/dates.ts",
        "src/lib/comercial.ts",
        "src/lib/conformidade.ts",
        "src/lib/senha.ts",
        "src/lib/email/modelos.ts",
      ],
      reporter: ["text", "html"],
      thresholds: {
        lines: 85,
        functions: 90,
        branches: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
