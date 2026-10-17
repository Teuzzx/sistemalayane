import Link from "next/link";
import { redirect } from "next/navigation";
import { exigirSecao } from "@/lib/exigir";

import { iniciarAnalise, listarModelosAtivos } from "@/actions/conformidade";
import { Icone } from "@/components/Icone";
import { requireAdmin } from "@/lib/auth";
import { listarClientes } from "@/lib/consultas";
import { CabecalhoPagina, Painel, Vazio } from "@/components/ui";

export const metadata = { title: "Novo diagnóstico" };

export default async function PaginaNovaAnalise({
  searchParams,
}: {
  searchParams: Promise<{ clienteId?: string }>;
}) {
  await exigirSecao("conformidade");
  const { clienteId } = await searchParams;

  const [clientes, modelos] = await Promise.all([
    listarClientes({}),
    listarModelosAtivos(),
  ]);

  const cliente = clientes.find((c) => c.id === clienteId);

  return (
    <div className="mx-auto flex w-full max-w-[680px] flex-col gap-7">
      <CabecalhoPagina
        eyebrow="Conformidade"
        titulo="Novo diagnóstico"
        descricao="Escolha o cliente e o questionário. A análise abre em branco e o relatório é emitido quando todas as perguntas estiverem respondidas."
        acoes={
          <Link href="/conformidade" className="btn btn-secundario">
            <Icone nome="seta-esq" tamanho={15} />
            Voltar
          </Link>
        }
      />

      {modelos.length === 0 ? (
        <Vazio
          titulo="Nenhum questionário ativo"
          texto="Crie um questionário antes de iniciar o diagnóstico."
          acao={
            <Link href="/conformidade/modelos" className="btn btn-primario">
              Criar questionário
            </Link>
          }
        />
      ) : (
        <Painel titulo="Configurar o diagnóstico">
          <form action={iniciarAnalise} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="clienteId" className="label">
                Cliente <span className="text-danger">*</span>
              </label>
              <select
                id="clienteId"
                name="clienteId"
                required
                defaultValue={clienteId ?? ""}
                className="field"
              >
                <option value="">Selecione…</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="modeloId" className="label">
                Questionário <span className="text-danger">*</span>
              </label>
              <select id="modeloId" name="modeloId" required className="field">
                {modelos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome} · v{m.versao}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="titulo" className="label">
                Título do diagnóstico
              </label>
              <input
                id="titulo"
                name="titulo"
                className="field"
                placeholder={
                  cliente
                    ? `Diagnóstico de conformidade — ${cliente.nome}`
                    : "Deixe vazio para usar o nome do questionário"
                }
              />
            </div>

            <div className="flex items-center gap-3 border-t border-line pt-5">
              <button type="submit" className="btn btn-primario">
                Iniciar diagnóstico
                <Icone nome="seta" tamanho={16} className="seta" />
              </button>
              {cliente && (
                <span className="text-[0.8125rem] text-muted">
                  Cliente: <strong className="font-500 text-ink">{cliente.nome}</strong>
                </span>
              )}
            </div>
          </form>
        </Painel>
      )}
    </div>
  );
}
