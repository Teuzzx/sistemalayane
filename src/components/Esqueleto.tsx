/**
 * Esqueleto de carregamento.
 *
 * Existe por um motivo medido: sem isto, cada navegação deixa a tela
 * CONGELADA durante a ida e a volta do servidor. No modo de desenvolvimento
 * a primeira visita a uma rota chega a 8 segundos de compilação — e a
 * pessoa só vê uma página parada, sem saber se clicou certo.
 *
 * O esqueleto não é decoration: tem a mesma geometria da página real
 * (cabeçalho, faixa de números, dois painéis), então não há "salto" de
 * layout quando o conteúdo entra.
 */

import { cn } from "@/lib/utils";

export function Esqueleto({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex flex-col gap-6", className)}
      aria-busy="true"
      aria-live="polite"
      aria-label="Carregando"
    >
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6">
        <div className="flex-1">
          <Barra w="w-40" h="h-7" />
          <Barra w="w-full max-w-[52ch]" h="h-3.5" mt="mt-3" />
        </div>
        <Barra w="w-28" h="h-9" />
      </div>

      {/* Faixa de números */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="painel p-4">
            <Barra w="w-20" h="h-2.5" />
            <Barra w="w-24" h="h-6" mt="mt-3" />
          </div>
        ))}
      </div>

      {/* Dois painéis */}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="painel p-5">
            <Barra w="w-32" h="h-3.5" />
            <div className="mt-4 flex flex-col gap-2.5">
              <Barra w="w-full" h="h-3" />
              <Barra w="w-11/12" h="h-3" />
              <Barra w="w-4/5" h="h-3" />
              <Barra w="w-9/12" h="h-3" />
            </div>
          </div>
        ))}
      </div>

      <p className="sr-only">Carregando conteúdo…</p>
    </div>
  );
}

/** Barra pulsante — o movimento é o que diz "isto está acontecendo". */
function Barra({
  w,
  h,
  mt,
  className,
}: {
  w: string;
  h: string;
  mt?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-full bg-[rgba(244,241,232,0.07)]",
        w,
        h,
        mt,
        className,
      )}
      style={{ animationDuration: "1400ms" }}
    />
  );
}