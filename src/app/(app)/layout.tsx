import { redirect } from "next/navigation";
import { and, count, eq, inArray, lte, ne } from "drizzle-orm";

import { FundoVideo } from "@/components/FundoVideo";
import { Navegacao } from "@/components/Navegacao";
import { db } from "@/db";
import {
  analisesConformidade,
  contratos,
  documentos,
  lancamentos,
} from "@/db/schema";
import { getUsuario } from "@/lib/auth";
import { hoje, somaDias } from "@/lib/dates";

export default async function LayoutInterno({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await getUsuario();
  if (!usuario) redirect("/login");

  /* Contadores da barra — só o que exige ação, nunca contagem total. */
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
    "/documentos": { n: docs?.n ?? 0, tom: "atencao" as const },
    "/financeiro": { n: contas?.n ?? 0, tom: "atencao" as const },
    "/conformidade": { n: analises?.n ?? 0, tom: "atencao" as const },
    "/contratos": { n: ativos?.n ?? 0, tom: "atencao" as const },
  };

  return (
    <div className="app">
      <FundoVideo />
      <Navegacao usuario={usuario} contagens={contagens} />

      <main className="conteudo">
        <div className="mx-auto w-full max-w-[1320px] px-4 pb-16 pt-16 sm:px-7 sm:pt-20 lg:px-10 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
