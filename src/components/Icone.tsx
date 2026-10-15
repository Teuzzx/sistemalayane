/**
 * Ícones — SVG inline autoral.
 *
 * Regra do projeto (DESIGN_DNA §4): sem biblioteca de ícones, sem ícone
 * decorativo, sem folha/globo/reciclagem/escudo. Canvas 24×24, stroke 1.5,
 * `currentColor`, `fill: none`. Ícone só entra quando acelera a leitura.
 */

import type { SVGProps } from "react";

export type NomeIcone =
  | "painel"
  | "clientes"
  | "demandas"
  | "documentos"
  | "financeiro"
  | "orcamentos"
  | "contratos"
  | "conformidade"
  | "config"
  | "busca"
  | "mais"
  | "seta"
  | "seta-esq"
  | "fechar"
  | "menu"
  | "filtro"
  | "imprimir"
  | "baixar"
  | "check"
  | "alerta"
  | "relogio"
  | "chevron"
  | "olho"
  | "lixeira"
  | "editar"
  | "copiar"
  | "telefone"
  | "email"
  | "local"
  | "calendario"
  | "painel-filtro"
  | "sair";

const TRACOS: Record<NomeIcone, string> = {
  painel: "M3 4h7v6H3zM14 4h7v4h-7zM14 12h7v8h-7zM3 14h7v6H3z",
  clientes:
    "M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M20 20v-1.5a3.5 3.5 0 0 0-2.6-3.4M15.5 4.2a3.5 3.5 0 0 1 0 6.6",
  demandas:
    "M3 4h18l-7 8.5V19l-4 2v-8.5z",
  documentos:
    "M14 3H7a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 7 21h10a1.5 1.5 0 0 0 1.5-1.5V7.5zM14 3v4.5h4.5M9 13h6M9 17h4",
  financeiro:
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M14.5 9.2A3 3 0 0 0 12 8c-1.7 0-3 .9-3 2.2 0 3 6 1.5 6 4.3 0 1.4-1.4 2.5-3 2.5a3.2 3.2 0 0 1-2.6-1.3M12 6v12",
  orcamentos:
    "M5 3h9l5 5v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1M14 3v5h5M8 13h8M8 17h5",
  contratos:
    "M3 20.5 5.5 16 17 4.5a2.1 2.1 0 0 1 3 3L8.5 19zM14.5 7 17 9.5M3 20.5h6",
  conformidade:
    "M9 5h10M9 12h10M9 19h10M4.5 5 5.6 6.2 7.8 3.8M4.5 12l1.1 1.2L7.8 10.8M4.5 19l1.1 1.2L7.8 17.8",
  config:
    "M4 7h9M17 7h3M4 17h3M11 17h9M15 4.5v5M8 14.5v5",
  busca: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14M20 20l-4-4",
  mais: "M12 5v14M5 12h14",
  seta: "M4 12h15M13 6l6 6-6 6",
  "seta-esq": "M20 12H5M11 6l-6 6 6 6",
  fechar: "M6 6l12 12M18 6 6 18",
  menu: "M4 8h16M4 16h16",
  filtro: "M3 5h18l-7 8v6l-4 2v-8z",
  imprimir:
    "M7 8V3h10v5M7 18H5a1.5 1.5 0 0 1-1.5-1.5v-5A1.5 1.5 0 0 1 5 10h14a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 19 18h-2M7 14h10v7H7z",
  baixar: "M12 3v12M7 11l5 5 5-5M4 20h16",
  check: "M4.5 12.5 9.5 17.5 19.5 6.5",
  alerta: "M12 4 2.5 20h19zM12 10v4M12 17h.01",
  relogio: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5.5l3.5 2",
  chevron: "M9 5l7 7-7 7",
  olho: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
  lixeira:
    "M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13M10 11v6M14 11v6",
  editar: "M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17zM15 6l3 3",
  copiar:
    "M8 8V4h12v12h-4M4 8h12v12H4z",
  telefone:
    "M7 3.5h3l1.5 4-2 1.5a11 11 0 0 0 5.5 5.5l1.5-2 4 1.5v3a1.5 1.5 0 0 1-1.6 1.5C10.5 18.3 5.7 13.5 5.5 5.1A1.5 1.5 0 0 1 7 3.5",
  email: "M3 6.5h18v11H3zM3 7l9 6.5L21 7",
  local: "M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5",
  calendario:
    "M4 6.5h16v14H4zM4 10.5h16M8.5 3.5v4M15.5 3.5v4",
  "painel-filtro": "M3 5h18l-7 8v6l-4 2v-8zM15.5 14.5h5M17.5 12.5v4",
  sair: "M14 8V4.5H4.5v15H14V16M9.5 12h11M17.5 8.5 21 12l-3.5 3.5",
};

export type PropsIcone = SVGProps<SVGSVGElement> & {
  nome: NomeIcone;
  tamanho?: number;
};

export function Icone({ nome, tamanho = 18, ...resto }: PropsIcone) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...resto}
    >
      <path d={TRACOS[nome]} />
    </svg>
  );
}