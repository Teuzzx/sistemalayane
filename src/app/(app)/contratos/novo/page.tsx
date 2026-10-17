import Link from "next/link";
import { exigirSecao } from "@/lib/exigir";

import { FormContrato } from "@/components/forms/FormContrato";
import { Icone } from "@/components/Icone";
import { listarClientes } from "@/lib/consultas";
import { CabecalhoPagina, Painel } from "@/components/ui";

export const metadata = { title: "Novo contrato" };

export default async function PaginaNovoContrato({
  searchParams,
}: {
  searchParams: Promise<{ clienteId?: string }>;
}) {
  await exigirSecao("contratos");

  const { clienteId } = await searchParams;
  const clientes = await listarClientes({});

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-7">
      <CabecalhoPagina
        eyebrow="Contratos"
        titulo="Novo contrato"
        descricao="Preencha os dados e o sistema gera o documento e lança o cronograma de cobrança."
        acoes={
          <Link href="/contratos" className="btn btn-secundario">
            <Icone nome="seta-esq" tamanho={15} />
            Voltar
          </Link>
        }
      />
      <Painel titulo="Contrato de prestação de serviços">
        <FormContrato clientes={clientes} clienteFixo={clienteId} />
      </Painel>
    </div>
  );
}
