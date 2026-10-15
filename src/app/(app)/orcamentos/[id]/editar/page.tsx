import Link from "next/link";

import { FormOrcamento } from "@/components/forms/FormOrcamento";
import { Icone } from "@/components/Icone";
import { detalheOrcamento, listarClientes } from "@/lib/consultas";
import { CabecalhoPagina, Painel } from "@/components/ui";
import { notFound } from "next/navigation";

export default async function PaginaEditarOrcamento({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dados = await detalheOrcamento(id);
  if (!dados) notFound();

  const clientes = await listarClientes({});

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-7">
      <CabecalhoPagina
        eyebrow="Orçamentos"
        titulo="Editar orçamento"
        descricao={`${dados.orcamento.numero} · ${dados.nomeCliente}`}
        acoes={
          <div className="flex gap-2">
            <Link href={`/doc/orcamento/${id}`} className="btn btn-secundario" target="_blank">
              <Icone nome="imprimir" tamanho={15} />
              Documento
            </Link>
            <Link href={`/orcamentos/${id}`} className="btn btn-secundario">
              <Icone nome="seta-esq" tamanho={15} />
              Voltar
            </Link>
          </div>
        }
      />
      <Painel titulo="Proposta">
        <FormOrcamento
          clientes={clientes}
          orcamento={{
            ...dados.orcamento,
            descontoPercentual: dados.orcamento.descontoPercentual,
          }}
        />
      </Painel>
    </div>
  );
}