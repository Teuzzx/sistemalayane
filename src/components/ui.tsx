/**
 * Primitivas de UI.
 *
 * Três superfícies, e a escolha entre elas é a decisão de design mais
 * importante do sistema (ver §VIDRO no globals.css):
 *
 *   `.painel`  — vidro. Painéis de número, cabeçalhos de seção, o que
 *                flutua e a pessoa opera.
 *   `solido`   — opaco. Tabela densa, campo de texto, documento.
 *   fio        — nenhuma. Lista de dado continua o fio de 1px.
 *
 * Card não é primitivo: onde cabe um fio, vai fio.
 */

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Tom semântico                                                       */
/* ------------------------------------------------------------------ */

export type Tom = "ok" | "warn" | "danger" | "info" | "mute" | "deep";

const TONS: Record<Tom, { fundo: string; texto: string; fio: string }> = {
  ok: {
    fundo: "bg-ok-bg",
    texto: "text-ok",
    fio: "border-ok/30",
  },
  warn: {
    fundo: "bg-warn-bg",
    texto: "text-warn",
    fio: "border-warn/30",
  },
  danger: {
    fundo: "bg-danger-bg",
    texto: "text-danger",
    fio: "border-danger/30",
  },
  info: { fundo: "bg-info-bg", texto: "text-info", fio: "border-info/30" },
  mute: {
    fundo: "bg-mute-bg",
    texto: "text-mute",
    fio: "border-[var(--vidro-fio)]",
  },
  deep: {
    fundo: "bg-[rgba(125,148,97,0.2)]",
    texto: "text-accent",
    fio: "border-accent/30",
  },
};

/** Mapeia o rótulo de um status ao tom. Fallback neutro. */
export function tomDeStatus(rotulo: string | undefined): Tom {
  switch (rotulo) {
    case "Ativo":
    case "Aprovado":
    case "Assinado":
    case "Conforme":
    case "Pago":
    case "Concluído":
    case "Emitido":
    case "Enviado":
      return "ok";
    case "Potencial":
    case "Consulta":
    case "Diagnóstico":
    case "Proposta":
    case "Contrato":
    case "Rascunho":
    case "Em resposta":
    case "Parcialmente conforme":
    case "Vencido":
      return "warn";
    case "Recusado":
    case "Cancelado":
    case "Não conforme":
    case "Atrasado":
    case "Vencida":
      return "danger";
    case "Em andamento":
    case "Convertido em contrato":
      return "info";
    default:
      return "mute";
  }
}

/** Documento vencido vs. a vencer — o painel depende disso. */
export function tomDeVencimento(dias: number): Tom {
  if (dias < 0) return "danger";
  if (dias <= 30) return "warn";
  return "ok";
}

/* ------------------------------------------------------------------ */
/* Etiqueta                                                            */
/* ------------------------------------------------------------------ */

export function Etiqueta({
  children,
  tom = "mute",
  className,
}: {
  children: ReactNode;
  tom?: Tom;
  className?: string;
}) {
  const t = TONS[tom];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px]",
        "text-[0.6875rem] font-600 whitespace-nowrap",
        t.fundo,
        t.texto,
        t.fio,
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Etiqueta que já descobre o tom a partir do próprio rótulo. */
export function EtiquetaStatus({ rotulo }: { rotulo: string | undefined }) {
  return <Etiqueta tom={tomDeStatus(rotulo)}>{rotulo ?? "—"}</Etiqueta>;
}

/* ------------------------------------------------------------------ */
/* Painel                                                              */
/* ------------------------------------------------------------------ */

/** Superfície de vidro com cabeçalho opcional. */
export function Painel({
  children,
  className,
  titulo,
  acoes,
  descricao,
  solido,
}: {
  children: ReactNode;
  className?: string;
  titulo?: string;
  acoes?: ReactNode;
  descricao?: string;
  /** Força superfície opaca — para o que carrega dado denso. */
  solido?: boolean;
}) {
  const classe = solido ? "solido" : "painel";

  return (
    <section
      className={cn(
        classe,
        "relative overflow-hidden",
        titulo || acoes ? "p-4 sm:p-5" : "p-4",
        className,
      )}
    >
      {(titulo || acoes) && (
        <header className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {titulo && (
              <h2 className="text-[0.9375rem] font-600 tracking-[-0.004em]">
                {titulo}
              </h2>
            )}
            {descricao && (
              <p className="mt-0.5 text-[0.8125rem] text-muted">{descricao}</p>
            )}
          </div>
          {acoes && <div className="flex shrink-0 items-center gap-2">{acoes}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

/** Rótulo + valor, fio embaixo. O par mais usado da tela. */
export function LinhaDado({
  rotulo,
  valor,
  detalhe,
  tom,
  className,
}: {
  rotulo: ReactNode;
  valor: ReactNode;
  /** Explicação curta do que o número significa, abaixo do valor. */
  detalhe?: ReactNode;
  tom?: Tom;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4 border-b border-line py-2.5 last:border-b-0",
        className,
      )}
    >
      <span className="label shrink-0">{rotulo}</span>
      {/* Valor e detalhe na mesma coluna, alinhados à direita — senão o
          detalhe passaria por baixo da linha e a leitura quebraria. */}
      <span className="flex min-w-0 flex-col items-end gap-1 text-right">
        <span
          className={cn(
            "min-w-0 text-[0.9375rem] tnum",
            tom === "danger" && "text-danger",
            tom === "warn" && "text-warn",
            tom === "ok" && "text-ok",
          )}
        >
          {valor}
        </span>
        {detalhe && (
          <span className="max-w-[46ch] text-[0.75rem] leading-relaxed text-faint">
            {detalhe}
          </span>
        )}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cabeçalho de página                                                 */
/* ------------------------------------------------------------------ */

/**
 * Contexto e título na mesma linha — sem "eyebrow" empilhado acima do
 * H1. O que a pessoa precisa saber primeiro (onde estou, sobre o que) fica
 * na mesma respiração; o secundário desce para a descrição.
 *
 * `eyebrow` é aceito por compatibilidade com as páginas, mas entra como
 * etiqueta AO LADO do título, não como um kicker acima dele.
 */
export function CabecalhoPagina({
  titulo,
  contexto,
  eyebrow,
  descricao,
  acoes,
}: {
  titulo: string;
  contexto?: ReactNode;
  eyebrow?: string;
  descricao?: string;
  acoes?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-6">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-[1.65rem] leading-none font-500 tracking-[-0.01em]">
            {titulo}
          </h1>
          {eyebrow && (
            <span className="rounded-full border border-[var(--vidro-fio)] px-2.5 py-[3px] text-[0.6875rem] tracking-[0.1em] text-[var(--color-tinta-3)] uppercase">
              {eyebrow}
            </span>
          )}
          {contexto}
        </div>
        {descricao && (
          <p className="mt-2.5 max-w-[64ch] text-[0.9375rem] leading-relaxed text-muted">
            {descricao}
          </p>
        )}
      </div>
      {acoes && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{acoes}</div>
      )}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Detalhe de território                                               */
/* ------------------------------------------------------------------ */

/** Numeral de índice — substitui ícone em lista. */
export function Indice({ n }: { n: number }) {
  return (
    <span className="text-[0.8125rem] font-500 tnum text-[var(--color-mineral)]">
      {String(n).padStart(2, "0")}
    </span>
  );
}

/**
 * Régua cartográfica — assinatura do sistema, sempre `aria-hidden`.
 * Virou fio simples com a coordenada no meio: no vidro, elemento demais
 * compete com o conteúdo.
 */
export function Regua({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex items-center gap-4", className)}
      aria-hidden="true"
    >
      <span className="h-px flex-1 bg-[var(--vidro-fio)]" />
      <span className="text-[0.6875rem] tracking-[0.22em] text-[var(--color-tinta-4)]">
        S 06°13′ · W 42°49′
      </span>
      <span className="h-px flex-1 bg-[var(--vidro-fio)]" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Estatística                                                         */
/* ------------------------------------------------------------------ */

/**
 * Painel de número. Um dado por painel de vidro — o gráfico de barras fica
 * com o peso visual; o número dá a medida, não compete com ele.
 */
export function Estatistica({
  rotulo,
  valor,
  detalhe,
  tom,
  href,
}: {
  rotulo: string;
  valor: ReactNode;
  detalhe?: ReactNode;
  tom?: Tom;
  href?: string;
}) {
  const conteudo = (
    <>
      <p className="label">{rotulo}</p>
      <p
        className={cn(
          "mt-2 text-[1.6rem] leading-none font-500 tracking-[-0.012em] tnum",
          tom === "danger" && "text-danger",
          tom === "warn" && "text-warn",
          tom === "ok" && "text-ok",
        )}
      >
        {valor}
      </p>
      {detalhe && (
        <p className="mt-2 text-[0.8125rem] text-muted">{detalhe}</p>
      )}
    </>
  );

  const classe = cn(
    "painel group relative overflow-hidden p-4 transition-all duration-200",
    href &&
      "transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-[var(--vidro-fio-forte)] hover:shadow-[0_4px_14px_rgba(0,0,0,0.4),0_20px_48px_rgba(0,0,0,0.42)]",
  );

  return href ? (
    <a href={href} className={classe}>
      {conteudo}
    </a>
  ) : (
    <div className={classe}>{conteudo}</div>
  );
}

/* ------------------------------------------------------------------ */
/* Estado vazio                                                        */
/* ------------------------------------------------------------------ */

export function Vazio({
  titulo,
  texto,
  acao,
}: {
  titulo: string;
  texto?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-[var(--radius-painel)] border border-dashed border-[var(--vidro-fio-forte)] bg-[rgba(244,241,232,0.02)] px-5 py-9">
      <div>
        <p className="text-[0.9375rem] font-500">{titulo}</p>
        {texto && (
          <p className="mt-1 max-w-[52ch] text-[0.875rem] leading-relaxed text-muted">
            {texto}
          </p>
        )}
      </div>
      {acao}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Formulário                                                          */
/* ------------------------------------------------------------------ */

/** Campo com rótulo acima e dica abaixo — sem placeholder como rótulo. */
export function Campo({
  rotulo,
  children,
  dica,
  erro,
  obrigatorio,
  className,
  htmlFor,
}: {
  rotulo: string;
  children: ReactNode;
  dica?: string;
  erro?: string;
  obrigatorio?: boolean;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="label">
        {rotulo}
        {obrigatorio && <span className="ml-1 text-danger">*</span>}
      </label>
      {children}
      {erro ? (
        <p className="text-[0.8125rem] text-danger">{erro}</p>
      ) : dica ? (
        <p className="text-[0.8125rem] text-faint">{dica}</p>
      ) : null}
    </div>
  );
}

/** Botão com a seta que desliza no hover. */
export function Botao({
  variante = "secundario",
  href,
  children,
  className,
  ...resto
}: {
  variante?: "primario" | "secundario" | "fantasma" | "perigo";
  href?: string;
  children: ReactNode;
  className?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className">) {
  const classes = cn("btn", `btn-${variante}`, className);

  if (href) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }
  return (
    <button className={classes} {...resto}>
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Misc                                                                */
/* ------------------------------------------------------------------ */

/** Mensagem de erro/sucesso vinda de uma Server Action. */
export function Aviso({
  tipo,
  children,
}: {
  tipo: "erro" | "ok" | "info";
  children: ReactNode;
}) {
  if (!children) return null;

  const estilo =
    tipo === "erro"
      ? "border-danger/30 bg-danger-bg text-danger"
      : tipo === "ok"
        ? "border-ok/30 bg-ok-bg text-ok"
        : "border-[var(--vidro-fio)] bg-[rgba(244,241,232,0.04)] text-muted";

  return (
    <div
      role={tipo === "erro" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-[var(--radius-xs)] border px-3.5 py-2.5 text-[0.875rem] leading-relaxed backdrop-blur-md",
        estilo,
      )}
    >
      {children}
    </div>
  );
}

/** Pílula de filtro/seleção — usada em cabeçalhos e no histórico do filtro. */
export function Pilula({
  children,
  ativo,
  href,
  ...resto
}: {
  children: ReactNode;
  ativo?: boolean;
  href?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const classes = cn(
    "rounded-full border px-3 py-[6px] text-[0.75rem] transition-all duration-150",
    ativo
      ? "border-accent/40 bg-[rgba(125,148,97,0.2)] text-ink shadow-[0_1px_0_rgba(255,255,255,0.14)_inset]"
      : "border-[var(--vidro-fio)] text-muted hover:border-[var(--vidro-fio-forte)] hover:bg-white/6 hover:text-ink",
  );

  if (href) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={classes} {...resto}>
      {children}
    </button>
  );
}