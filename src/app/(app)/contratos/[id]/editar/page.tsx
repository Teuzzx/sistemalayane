import Link from "next/link";
import { notFound } from "next/navigation";

import { FormContrato } from "@/components/forms/FormContrato";
import { Icone } from "@/components/Icone";
import { detalheContrato, listarClientes } from "@/lib/consultas";
import { CabecalhoPagina, Painel } from "@/components/ui";

export default async function PaginaEditarContrato({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dados = await detalheContrato(id);
  if (!dados) notFound();

  const clientes = await listarClientes({});

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-7">
      <CabecalhoPagina
        eyebrow="Contratos"
        titulo="Editar contrato"
        descricao={`${dados.contrato.numero} · ${dados.nomeCliente}`}
        acoes={
          <div className="flex gap-2">
            <Link href={`/doc/contrato/${id}`} className="btn btn-secundario" target="_blank">
              <Icone nome="imprimir" tamanho={15} />
              Documento
            </Link>
            <Link href={`/contratos/${id}`} className="btn btn-secundario">
              <Icone nome="seta-esq" tamanho={15} />
              Voltar
            </Link>
          </div>
        }
      />
      <Painel titulo="Dados do contrato">
        <FormContrato clientes={clientes} contrato={dados.contrato} />
      </Painel>
    </div>
  );
}