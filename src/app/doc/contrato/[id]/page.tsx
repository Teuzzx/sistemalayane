import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { DocContrato } from "@/components/docs/DocContrato";
import { db } from "@/db";
import { clientes } from "@/db/schema";
import { detalheContrato } from "@/lib/consultas";

export const metadata = { title: "Contrato (documento)" };

export default async function PaginaDocContrato({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dados = await detalheContrato(id);
  if (!dados) notFound();

  const contato = await db
    .select({ nome: clientes.contatoNome, cargo: clientes.contatoCargo })
    .from(clientes)
    .where(eq(clientes.id, dados.contrato.clienteId))
    .limit(1);

  return (
    <DocContrato
      c={dados.contrato}
      nomeCliente={dados.nomeCliente}
      cnpj={dados.cnpj}
      contato={contato[0] ?? null}
    />
  );
}