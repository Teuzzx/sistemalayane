import { DocOrcamento } from "@/components/docs/DocOrcamento";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { orcamentos, clientes } from "@/db/schema";
import { detalheOrcamento } from "@/lib/consultas";
import { notFound } from "next/navigation";

export const metadata = { title: "Orçamento (documento)" };

export default async function PaginaDocOrcamento({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dados = await detalheOrcamento(id);
  if (!dados) notFound();

  const contato = await db
    .select({
      nome: clientes.contatoNome,
      cargo: clientes.contatoCargo,
    })
    .from(clientes)
    .where(eq(clientes.id, dados.orcamento.clienteId))
    .limit(1);

  return (
    <DocOrcamento
      o={dados.orcamento}
      nomeCliente={dados.nomeCliente}
      cnpj={dados.cnpj}
      contato={contato[0] ?? null}
    />
  );
}