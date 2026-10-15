/**
 * Primitivas de UI.
 *
 * Regra do projeto: **card não é primitivo**. O separador é o fio de 1px.
 * O que existe aqui são linhas, etiquetas, campos e blocos de painel —
 * nunca grid de caixinhas iguais. O numeral de índice substitui o ícone
 * nas listas.
 */

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Tom semântico                                                       */
/* ------------------------------------------------------------------ */

export type Tom = "ok" | "warn" | "danger" | "info" | "mute" | "deep";

const TONS: Record<Tom, { fundo: string; texto: string; fio: string }> = {
  ok: { fundo: "bg-ok-bg", texto: "text-ok", fio: "border-ok/25" },
  warn: { fundo: "bg-warn-bg", texto: "text-warn", fio: "border-warn/25" },
  danger: { fundo: "bg-danger-bg", texto: "text-danger", fio: "border-danger/25" },
  info: { fundo: "bg-info-bg", texto: "text-info", fio: "border-info/25" },
  mute: { fundo: "bg-mute-bg", texto: "text-mute", fio: "border-line-strong" },
  deep: { fundo: "bg-deep", texto: "text-on-deep", fio: "border-deep" },
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
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5",
        "text-[0.6875rem] font-semibold uppercase tracking-[0.12em] whitespace-nowrap",
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
/* Blocos                                                              */
/* ------------------------------------------------------------------ */

/** Painel de superfície com fio. É o "cartão" deste projeto — usado com parcimônia. */
export function Painel({
  children,
  className,
  titulo,
  acoes,
  descricao,
}: {
  children: ReactNode;
  className?: string;
  titulo?: string;
  acoes?: ReactNode;
  descricao?: string;
}) {
  return (
    <section className={cn("border-t border-line", className)}>
      {(titulo || acoes) && (
        <header className="flex items-end justify-between gap-4 pb-3">
          <div>
            {titulo && <h2 className="text-[0.9375rem] font-600">{titulo}</h2>}
            {descricao && (
              <p className="mt-0.5 text-[0.8125rem] text-muted">{descricao}</p>
            )}
          </div>
          {acoes}
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
  tom,
  className,
}: {
  rotulo: ReactNode;
  valor: ReactNode;
  tom?: Tom;
  className?: string;
}) {
  return (
    <div className={cn("linha-dado", className)}>
      <span className="label shrink-0">{rotulo}</span>
      <span
        className={cn(
          "min-w-0 text-right text-[0.9375rem] tnum",
          tom === "danger" && "text-danger",
          tom === "warn" && "text-warn",
          tom === "ok" && "text-ok",
        )}
      >
        {valor}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cabeçalho de página                                                 */
/* ------------------------------------------------------------------ */

export function CabecalhoPagina({
  eyebrow,
  titulo,
  descricao,
  acoes,
}: {
  eyebrow?: string;
  titulo: string;
  descricao?: string;
  acoes?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
      <div className="min-w-0">
        {eyebrow && <p className="label mb-1.5">{eyebrow}</p>}
        <h1 className="text-[1.6rem] leading-tight font-500 tracking-[-0.008em]">
          {titulo}
        </h1>
        {descricao && (
          <p className="mt-1.5 max-w-[62ch] text-[0.9375rem] text-muted">
            {descricao}
          </p>
        )}
      </div>
      {acoes && <div className="flex shrink-0 flex-wrap gap-2">{acoes}</div>}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Estatística                                                         */
/* ------------------------------------------------------------------ */

/**
 * O painel mostra 4–6 números grandes. Sem card: fio embaixo, numeral
 * tabular, unidade em label acima. O valor é o herói, o rótulo é o fio.
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
          "mt-1 text-[1.75rem] leading-none font-500 tracking-[-0.012em] tnum",
          tom === "danger" && "text-danger",
          tom === "warn" && "text-warn",
          tom === "ok" && "text-ok",
        )}
      >
        {valor}
      </p>
      {detalhe && (
        <p className="mt-1.5 text-[0.8125rem] text-muted">{detalhe}</p>
      )}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className="block border-t border-line pt-3 transition-colors duration-150 hover:border-accent"
      >
        {conteudo}
      </a>
    );
  }

  return <div className="border-t border-line pt-3">{conteudo}</div>;
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
    <div className="flex flex-col items-start gap-3 border border-dashed border-line-strong px-5 py-10">
      <div>
        <p className="text-[0.9375rem] font-500">{titulo}</p>
        {texto && (
          <p className="mt-1 max-w-[52ch] text-[0.875rem] text-muted">{texto}</p>
        )}
      </div>
      {acao}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Formulário                                                          */
/* ------------------------------------------------------------------ */

/**
 * Campo com label acima e dica abaixo. Sem placeholder como label —
 * o DESIGN_DNA é explícito nisso.
 */
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
  const classes = cn(
    "btn",
    `btn-${variante}`,
    className,
  );
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

/** Número de índice (01–09) — substitui ícone de lista. */
export function Indice({ n }: { n: number }) {
  return <span className="index-num">{String(n).padStart(2, "0")}</span>;
}

/** Fio de coordenada — assinatura cartográfica do sistema, sempre `aria-hidden`. */
export function Regua({
  className,
  rotulos = true,
}: {
  className?: string;
  rotulos?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)} aria-hidden="true">
      <span className="h-px flex-1 bg-line" />
      {rotulos && (
        <span className="index-num tracking-[0.1em]">
          S 06°13&apos; · W 42°49&apos;
        </span>
      )}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

/** Mensagem de erro/sucesso vinda de uma Server Action. */
export function Aviso({
  tipo,
  children,
}: {
  tipo: "erro" | "ok" | "info";
  children: ReactNode;
}) {
  if (!children) return null;
  return (
    <div
      role={tipo === "erro" ? "alert" : "status"}
      className={cn(
        "rounded-xs border px-3.5 py-2.5 text-[0.875rem]",
        tipo === "erro" && "border-danger/30 bg-danger-bg text-danger",
        tipo === "ok" && "border-ok/30 bg-ok-bg text-ok",
        tipo === "info" && "border-line-strong bg-surface-2 text-muted",
      )}
    >
      {children}
    </div>
  );
}