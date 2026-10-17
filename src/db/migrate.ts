/**
 * Aplica as migrations pendentes. Executar com `npm run db:migrate`.
 */

import { migrate } from "drizzle-orm/node-postgres/migrator";

import { db } from "./index";

async function main() {
  console.log("→ aplicando migrations...");
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  console.log("✓ banco atualizado.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("✗ falha na migration:", err);
    process.exit(1);
  });