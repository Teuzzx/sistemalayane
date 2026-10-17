import Link from "next/link";

import { FormDocumento } from "@/components/forms/FormDocumento";
import { Icone } from "@/components/Icone";
import { marcarDocumento } from "@/actions/demandas";
import { listarDocumentos, opcoesClientes } from "@/lib/consultas";
import { diasAte, formatarData, prazoRelativo } from "@/lib/dates";
import {
  CabecalhoPagina,
  Etiqueta,
  Painel,
  Vazio,
  tomDeVencimento,
} from "@/components/ui";

export const metadata = { title: "Documentos e vencimentos" };

const JANELAS = [
  { v: "30", r: "30 dias" },
  { v: "60", r: "60 dias" },
  { v: "90", r: "90 dias" },
  { v: "todos", r: "Todos" },
];

export default async function PaginaDocumentos({
  searchParams,
}: {
  searchParams: Promise<{
    janela?: string;
    clienteId?: string;
    novo?: string;
    texto?: string;
  }>;
}) {
  const { clienteId, novo, texto } = await searchParams;
  const params = await searchParams;
  const janelaBruta = params.janela;

  // Só valida o que a tela sabe oferecer — URL manipulada não vira query.
  const janela: "30" | "60" | "90" | "todos" =
    janelaBruta === "30" || janelaBruta === "90" || janelaBruta === "todos"
      ? janelaBruta
      : "60";

  // O status de vencimento é derivado na leitura (ver `statusDeVencimento`).
  const [documentos, clientes] = await Promise.all([
    listarDocumentos({ janela, clienteId, texto }),
    opcoesClientes(),
  ]);

  const vencidos = documentos.filter((d) => d.status === "vencido");
  const proximos = documentos.filter((d) => d.status === "a_vencer");

  return (
    <div className="flex flex-col gap-7">
      <CabecalhoPagina
        eyebrow="Controle"
        titulo="Documentos e vencimentos"
        descricao="Cada licença, autorização e certidão com a data em que para de valer. O painel avisa antes do cliente perguntar."
        acoes={
          <Link href="/documentos?novo=1" className="btn btn-primario">
            <Icone nome="mais" tamanho={16} />
            Novo documento
          </Link>
        }
      />

      {vencidos.length > 0 && (
        <div className="border border-danger/30 bg-danger-bg px-4 py-3">
          <p className="text-[0.9375rem] font-500 text-danger">
            {vencidos.length} documento{vencidos.length === 1 ? " vencido" : "s vencidos"}
          </p>
          <p className="mt-0.5 text-[0.875rem] text-danger/85">
            Documento vencido é risco de autuação. Resolva ou registre por que não se
            aplica.
          </p>
        </div>
      )}

      <nav className="flex flex-wrap items-end gap-3 border-b border-line pb-4">
        <div className="flex flex-wrap gap-1.5">
          {JANELAS.map((j) => {
            const ativo = (janela ?? "60") === j.v;
            return (
              <Link
                key={j.v}
                href={`/documentos?janela=${j.v}${clienteId ? `&clienteId=${clienteId}` : ""}`}
                className={[
                  "rounded-full border px-3 py-1.5 text-[0.75rem] transition-colors duration-150",
                  ativo
                    ? "border-deep bg-deep text-on-deep"
                    : "border-line-strong text-muted hover:border-accent hover:text-ink",
                ].join(" ")}
              >
                {j.r}
              </Link>
            );
          })}
        </div>

        <form method="GET" className="flex flex-1 items-end gap-2">
          <input type="hidden" name="janela" value={janela ?? "60"} />
          <div className="min-w-[180px] flex-1">
            <label htmlFor="texto" className="label mb-1.5 block">
              Buscar
            </label>
            <input
              id="texto"
              name="texto"
              defaultValue={texto ?? ""}
              placeholder="Nome do documento"
              className="field"
            />
          </div>
          <button type="submit" className="btn btn-secundario">
            <Icone nome="busca" tamanho={15} />
            Buscar
          </button>
        </form>
      </nav>

      {novo && (
        <Painel titulo="Registrar documento" descricao="Vincule a um cliente e informe a validade.">
          <FormDocumento clientes={clientes} clienteId={clienteId} />
        </Painel>
      )}

      {documentos.length === 0 ? (
        <Vazio
          titulo="Nenhum documento nesta janela"
          texto="Cadastre as licenças e certidões para o sistema lembrar o vencimento por você."
          acao={
            <Link href="/documentos?novo=1" className="btn btn-primario">
              Registrar documento
            </Link>
          }
        />
      ) : (
        <>
          {proximos.length > 0 && (
            <p className="label">{proximos.length} a vencer nos próximos dias</p>
          )}

          <div className="overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Cliente</th>
                  <th>Órgão</th>
                  <th>Validade</th>
                  <th>Situação</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {documentos.map((d) => {
                  const dias = diasAte(d.validade);

                  return (
                    <tr key={d.id}>
                      <td>
                        <p className="font-500">{d.nome}</p>
                        {d.tipo && (
                          <p className="text-[0.8125rem] text-faint">{d.tipo}</p>
                        )}
                      </td>
                      <td>
                        <Link
                          href={`/clientes/${d.clienteId}`}
                          className="hover:text-accent"
                        >
                          {d.cliente}
                        </Link>
                      </td>
                      <td className="text-muted">
                        {d.orgao ?? "—"}
                        {d.numero && (
                          <p className="text-[0.8125rem] text-faint tnum">{d.numero}</p>
                        )}
                      </td>
                      <td className="tnum text-muted">{formatarData(d.validade)}</td>
                      <td>
                        {d.status === "vencido" ? (
                          <Etiqueta tom="danger">Vencido</Etiqueta>
                        ) : d.status === "a_vencer" ? (
                          <Etiqueta tom="warn">{prazoRelativo(d.validade)}</Etiqueta>
                        ) : d.status === "nao_aplicavel" ? (
                          <Etiqueta tom="mute">Não se aplica</Etiqueta>
                        ) : (
                          <Etiqueta tom={tomDeVencimento(dias ?? 999)}>
                            {prazoRelativo(d.validade)}
                          </Etiqueta>
                        )}
                      </td>
                      <td className="num">
                        {d.status !== "nao_aplicavel" && (
                          <form action={marcarDocumento} className="inline">
                            <input type="hidden" name="id" value={d.id} />
                            <input
                              type="hidden"
                              name="status"
                              value={d.status === "vencido" ? "valido" : "nao_aplicavel"}
                            />
                            <button
                              type="submit"
                              className="text-[0.75rem] font-600 uppercase tracking-[0.12em] text-accent hover:underline"
                            >
                              {d.status === "vencido" ? "Renovar" : "Não se aplica"}
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}