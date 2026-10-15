import { notFound } from "next/navigation";

import { DocConformidade } from "@/components/docs/DocConformidade";
import { detalheAnalise } from "@/lib/consultas";
import { requireAdmin } from "@/lib/auth";
import type { Resposta } from "@/db/schema";
import { mascararDocumento } from "@/lib/utils";

export const metadata = { title: "Relatório de conformidade (documento)" };

export default async function PaginaDocConformidade({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const dados = await detalheAnalise(id);
  if (!dados) notFound();

  const { analise } = dados;
  const modelo = analise.modeloAplicado;

  // Sem modelo congelado não há relatório honesto — o emitido é o que vale.
  if (!modelo) notFound();

  return (
    <DocConformidade
      modelo={modelo}
      respostas={(analise.respostas ?? {}) as Record<string, Resposta>}
      cliente={{
        nome: dados.nomeCliente,
        cnpj: dados.cnpj ? mascararDocumento(dados.cnpj) : null,
        cidade: dados.cidade,
        uf: dados.uf,
      }}
      titulo={analise.titulo}
      indice={analise.indiceConformidade}
      parecer={analise.parecer}
      recomendacoes={analise.recomendacoes}
      emitidoEm={analise.emitidoEm}
    />
  );
}