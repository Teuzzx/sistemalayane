import { notFound } from "next/navigation";
import { exigirSecao } from "@/lib/exigir";

import { FormCliente } from "@/components/forms/FormCliente";
import { detalheCliente } from "@/lib/consultas";
import { CabecalhoPagina } from "@/components/ui";

export const metadata = { title: "Editar cliente" };

export default async function PaginaEditarCliente({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await exigirSecao("clientes");

  const { id } = await params;
  const dados = await detalheCliente(id);
  if (!dados) notFound();

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-7">
      <CabecalhoPagina
        eyebrow="Cadastro"
        titulo="Editar cliente"
        descricao={dados.cliente.nome}
      />
      <FormCliente dados={{ ...dados.cliente, id: dados.cliente.id }} />
    </div>
  );
}
