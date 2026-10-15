import Link from "next/link";

import { FormOrcamento } from "@/components/forms/FormOrcamento";
import { Icone } from "@/components/Icone";
import { listarClientes } from "@/lib/consultas";
import { CabecalhoPagina, Painel } from "@/components/ui";

export const metadata = { title: "Novo orçamento" };

export default async function PaginaNovoOrcamento({
  searchParams,
}: {
  searchParams: Promise<{ clienteId?: string }>;
}) {
  const { clienteId } = await searchParams;
  const clientes = await listarClientes({});

  const cliente = clientes.find((c) => c.id === clienteId);
  if (clienteId && !cliente) {
    return (
      <CabecalhoPagina
        eyebrow="Orçamento"
        titulo="Cliente não encontrado"
        descricao="Volte e escolha um cliente válido."
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-7">
      <CabecalhoPagina
        eyebrow="Comercial"
        titulo="Novo orçamento"
        descricao={
          cliente
            ? `Para ${cliente.nome}. Monte os itens, o desconto é seu — o total sai certo.`
            : "Monte os itens, aplique o desconto que combinar. O total é recalculado pelo servidor antes de gravar."
        }
        acoes={
          <Link href="/orcamentos" className="btn btn-secundario">
            <Icone nome="seta-esq" tamanho={15} />
            Voltar
          </Link>
        }
      />

      <Painel titulo="Proposta">
        <FormOrcamento clientes={clientes} clienteFixo={clienteId} />
      </Painel>
    </div>
  );
}