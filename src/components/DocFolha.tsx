import Link from "next/link";

import { Icone } from "@/components/Icone";
import { Imprimir } from "@/components/Imprimir";
import { dataExtensoLonga } from "@/lib/dates";

/**
 * Moldura do documento que vai para o cliente.
 *
 * Sem barra lateral, sem botões, sem cor de fundo: só o papel com o
 * conteúdo e a barra de impressão. O CSS de impressão (globals.css)
 * remove tudo que é `nao-imprimir` e joga o resto em preto sobre branco.
 */
export function DocFolha({
  titulo,
  subtitulo,
  tipo,
  voltar,
  children,
  rodape,
}: {
  titulo: string;
  subtitulo?: string;
  /** Selo do canto superior direito: "ORÇAMENTO", "CONTRATO", "RELATÓRIO". */
  tipo: string;
  voltar: string;
  children: React.ReactNode;
  rodape?: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-surface-2 py-8 print:bg-white print:py-0">
      <div className="nao-imprimir mx-auto mb-5 flex max-w-[820px] items-center justify-between gap-3 px-6">
        <Link href={voltar} className="btn btn-fantasma">
          <Icone nome="seta-esq" tamanho={15} />
          Voltar
        </Link>
        <Imprimir />
      </div>

      <article className="doc-impressao mx-auto max-w-[820px] bg-white px-10 py-12 text-ink sm:px-14">
        <header className="doc-cabecalho mb-9 flex items-start justify-between gap-6 border-b-2 border-ink pb-6">
          <div>
            <p className="text-[1.25rem] leading-tight font-500">
              Layane Marques
              <span className="font-accent ml-1.5">Gestão</span>
            </p>
            <p className="mt-0.5 text-[0.8125rem] text-muted">
              Gestão Ambiental Aplicada · Piauí | Atuação Nacional
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="label">{tipo}</p>
            <p className="mt-1 text-[1.0625rem] font-500">{titulo}</p>
            {subtitulo && (
              <p className="mt-0.5 max-w-[30ch] text-[0.8125rem] text-muted">
                {subtitulo}
              </p>
            )}
          </div>
        </header>

        <div className="doc-corpo">{children}</div>

        <footer className="mt-12 border-t border-line pt-6 text-[0.75rem] leading-relaxed text-muted">
          {rodape ?? (
            <>
              <p>Layane Marques — Gestão Ambiental Aplicada</p>
              <p className="mt-1">
                Documento emitido em{" "}
                {dataExtensoLonga(new Date().toISOString().slice(0, 10))}.
              </p>
            </>
          )}
        </footer>
      </article>
    </div>
  );
}