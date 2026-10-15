import { redirect } from "next/navigation";
import { and, count, eq, inArray, lte, ne, sql } from "drizzle-orm";

import { Navegacao } from "@/components/Navegacao";
import { db } from "@/db";
import { analisesConformidade, contratos, documentos, lancamentos } from "@/db/schema";
import { getUsuario } from "@/lib/auth";
import { hoje, somaDias } from "@/lib/dates";

export default async function LayoutInterno({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await getUsuario();
  if (!usuario) redirect("/login");

  /* Contadores da barra lateral — só o que exige ação, não contagem total. */
  const [docs] = await db
    .select({ n: count() })
    .from(documentos)
    .where(
      and(
        ne(documentos.status, "nao_aplicavel"),
        lte(documentos.validade, somaDias(hoje(), 30)),
      ),
    );

  const [contas] = await db
    .select({ n: count() })
    .from(lancamentos)
    .where(
      and(
        eq(lancamentos.status, "pendente"),
        lte(lancamentos.vencimento, somaDias(hoje(), 7)),
      ),
    );

  const [analises] = await db
    .select({ n: count() })
    .from(analisesConformidade)
    .where(eq(analisesConformidade.status, "em_resposta"));

  const [ativos] = await db
    .select({ n: count() })
    .from(contratos)
    .where(inArray(contratos.status, ["ativo", "assinado"]));

  const contagens = {
    "/documentos": {
      n: docs?.n ?? 0,
      tom: "warn" as const,
    },
    "/financeiro": {
      n: contas?.n ?? 0,
      tom: "warn" as const,
    },
    "/conformidade": { n: analises?.n ?? 0, tom: "warn" as const },
    "/contratos": { n: ativos?.n ?? 0, tom: "warn" as const },
  };

  return (
    <div className="min-h-dvh">
      <Navegacao usuario={usuario} contagens={contagens} />
      <main className="lg:pl-[248px]">
        <div className="mx-auto w-full max-w-[1240px] px-5 py-7 sm:px-8 sm:py-9 lg:px-12">
          {children}
        </div>
      </main>
    </div>
  );
}