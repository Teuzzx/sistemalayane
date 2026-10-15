import { FormCliente } from "@/components/forms/FormCliente";
import { CabecalhoPagina } from "@/components/ui";

export const metadata = { title: "Novo cliente" };

export default function PaginaNovoCliente() {
  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-7">
      <CabecalhoPagina
        eyebrow="Cadastro"
        titulo="Novo cliente"
        descricao="Preencha o que já souber. O que faltar você completa depois — o sistema não exige tudo agora."
      />
      <FormCliente />
    </div>
  );
}