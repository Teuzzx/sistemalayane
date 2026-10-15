"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Icone, type NomeIcone } from "./Icone";
import { sair } from "@/actions/auth";
import { ehAdmin, rotuloPapel } from "@/lib/papeis";
import type { Usuario } from "@/db/schema";
import { iniciais } from "@/lib/utils";

const CHAVE = "layane.lateral";

type Item = {
  href: string;
  rotulo: string;
  icone: NomeIcone;
  admin?: boolean;
  /** Badge de trabalho pendente — só o que exige ação, nunca contagem total. */
  contagem?: number;
  tom?: "perigo" | "atencao";
};

/**
 * Grupos de navegação.
 *
 * A ordem conta: o que a Layane faz todo dia vem primeiro, o que ela
 * gerencia vem depois. Um menu de 9 itens sem grupo obriga a pessoa a ler
 * tudo para achar o segundo item.
 */
const GRUPOS: { titulo: string; itens: Item[] }[] = [
  {
    titulo: "Operação",
    itens: [
      { href: "/painel", rotulo: "Painel", icone: "painel" },
      { href: "/clientes", rotulo: "Clientes", icone: "clientes" },
      { href: "/demandas", rotulo: "Demandas", icone: "demandas" },
      { href: "/documentos", rotulo: "Documentos", icone: "documentos", tom: "atencao" },
    ],
  },
  {
    titulo: "Comercial",
    itens: [
      { href: "/orcamentos", rotulo: "Orçamentos", icone: "orcamentos" },
      { href: "/contratos", rotulo: "Contratos", icone: "contratos" },
    ],
  },
  {
    titulo: "Caixa",
    itens: [
      { href: "/financeiro", rotulo: "Financeiro", icone: "financeiro", tom: "atencao" },
    ],
  },
  {
    titulo: "Sistema",
    itens: [
      {
        href: "/conformidade",
        rotulo: "Conformidade",
        icone: "conformidade",
        admin: true,
      },
      { href: "/config", rotulo: "Configurações", icone: "config", admin: true },
    ],
  },
];

export function Navegacao({
  usuario,
  contagens,
}: {
  usuario: Usuario;
  contagens?: Record<string, { n: number; tom: "perigo" | "atencao" }>;
}) {
  const [recolhida, setRecolhida] = useState(false);
  const [gaveta, setGaveta] = useState(false);
  const caminho = usePathname();

  /* O estado vive no <html> porque o conteúdo fora do layout também
     precisa saber a largura da barra. E persiste — quem recolhe uma vez
     não quer recolher toda sessão. */
  useEffect(() => {
    const salva = localStorage.getItem(CHAVE) === "1";
    setRecolhida(salva);
    document.documentElement.dataset.recolhida = String(salva);
  }, []);

  const alternar = useCallback(() => {
    setRecolhida((v) => {
      const novo = !v;
      document.documentElement.dataset.recolhida = String(novo);
      localStorage.setItem(CHAVE, novo ? "1" : "0");
      return novo;
    });
  }, []);

  useEffect(() => setGaveta(false), [caminho]);

  // Esc fecha a gaveta no mobile.
  useEffect(() => {
    if (!gaveta) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setGaveta(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gaveta]);

  // Bloqueia o scroll do fundo enquanto a gaveta está aberta.
  useEffect(() => {
    document.body.style.overflow = gaveta ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [gaveta]);

  const visiveis = GRUPOS.map((g) => ({
    ...g,
    itens: g.itens.filter((i) => !i.admin || ehAdmin(usuario)),
  })).filter((g) => g.itens.length > 0);

  const itemAtivo = (href: string) =>
    caminho === href || caminho.startsWith(`${href}/`);

  return (
    <>
      {/* ---------- Barra superior (mobile / tablet) ---------- */}
      <header className="nao-imprimir fixed inset-x-0 top-0 z-50 flex h-14 items-center gap-3 border-b border-[var(--vidro-fio)] bg-[rgba(18,22,14,0.78)] px-4 backdrop-blur-2xl lg:hidden">
        <button
          type="button"
          onClick={() => setGaveta(true)}
          aria-label="Abrir menu"
          aria-expanded={gaveta}
          className="flex size-9 items-center justify-center rounded-[var(--radius-xs)] border border-[var(--vidro-fio)] text-[var(--color-tinta-2)] transition-colors duration-150 hover:bg-white/6 hover:text-[var(--color-tinta)]"
        >
          <Icone nome="menu" tamanho={18} />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.9375rem] font-500 leading-none">
            Layane Marques<span className="font-accent ml-1.5">Gestão</span>
          </p>
          <p className="mt-0.5 truncate text-[0.6875rem] text-[var(--color-tinta-3)]">
            {TituloDaRota(caminho)}
          </p>
        </div>

        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/8 text-[0.6875rem] font-600 text-[var(--color-tinta)]">
          {iniciais(usuario.nome)}
        </span>
      </header>

      {/* ---------- Gaveta (mobile) ---------- */}
      {gaveta && (
        <div className="nao-imprimir fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setGaveta(false)}
            className="animar-escurecer absolute inset-0 w-full bg-black/58 backdrop-blur-[3px]"
          />
          <aside
            className="animar-lado absolute inset-y-0 left-0 flex w-[286px] flex-col border-r border-[var(--vidro-fio)]"
            style={{
              background: "linear-gradient(180deg, rgba(22,27,17,0.96), rgba(15,19,11,0.96))",
            }}
          >
            <div className="flex items-center justify-between px-4 pb-4 pt-5">
              <Marca />
              <button
                type="button"
                onClick={() => setGaveta(false)}
                aria-label="Fechar menu"
                className="flex size-8 items-center justify-center rounded-full text-[var(--color-tinta-2)] transition-colors duration-150 hover:bg-white/8 hover:text-[var(--color-tinta)]"
              >
                <Icone nome="fechar" tamanho={17} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3">
              <ListaGrupos
                grupos={visiveis}
                itemAtivo={itemAtivo}
                contagens={contagens}
              />
            </nav>
            <RodapeLateral usuario={usuario} />
          </aside>
        </div>
      )}

      {/* ---------- Barra lateral (desktop) ---------- */}
      <aside className="nao-imprimir lateral hidden lg:flex">
        <div className="flex items-center justify-between gap-2 px-3.5 pb-3 pt-4">
          <Marca />
          <button
            type="button"
            onClick={alternar}
            aria-label={recolhida ? "Expandir menu" : "Recolher menu"}
            title={recolhida ? "Expandir menu" : "Recolher menu"}
            className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-xs)] text-[var(--color-tinta-2)] transition-all duration-150 hover:bg-white/8 hover:text-[var(--color-tinta)]"
          >
            <Icone nome={recolhida ? "seta" : "seta-esq"} tamanho={16} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 pb-2">
          <ListaGrupos
            grupos={visiveis}
            itemAtivo={itemAtivo}
            contagens={contagens}
          />
        </nav>

        <RodapeLateral usuario={usuario} recolhida={recolhida} />
      </aside>
    </>
  );
}

/* ------------------------------------------------------------------ */

function Marca() {
  return (
    <Link
      href="/painel"
      className="flex min-w-0 items-center gap-2.5"
      aria-label="Layane Marques — ir para o painel"
    >
      {/* A marca fica sempre visível: recolhido, ela é a única coisa que
          ancora a tela. Some só a palavra. */}
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-b from-[#a9c48a] to-[#6f8a55] text-[0.8125rem] font-700 text-[#14190f] shadow-[0_1px_0_rgba(255,255,255,0.35)_inset,0_2px_10px_rgba(134,169,106,0.3)]">
        LM
      </span>
      <span className="lateral__rotulo min-w-0">
        <span className="block truncate text-[0.9375rem] font-500 leading-tight">
          Layane Marques
        </span>
        <span className="block truncate text-[0.6875rem] text-[var(--color-tinta-3)]">
          Gestão Ambiental
        </span>
      </span>
    </Link>
  );
}

function ListaGrupos({
  grupos,
  itemAtivo,
  contagens,
}: {
  grupos: { titulo: string; itens: Item[] }[];
  itemAtivo: (href: string) => boolean;
  contagens?: Record<string, { n: number; tom: "perigo" | "atencao" }>;
}) {
  return (
    <ul className="lateral__grupos flex flex-col gap-3">
      {grupos.map((grupo) => (
        <li key={grupo.titulo}>
          <p className="lateral__grupo-rotulo label mb-1 px-2.5">
            {grupo.titulo}
          </p>
          <ul className="flex flex-col gap-0.5">
            {grupo.itens.map((item) => {
              const ativo = itemAtivo(item.href);
              const contador = contagens?.[item.href]?.n;

              return (
                <li key={item.href} className="relative">
                  <Link
                    href={item.href}
                    aria-current={ativo ? "page" : undefined}
                    className="lateral__item"
                  >
                    <span className="shrink-0">
                      <Icone
                        nome={item.icone}
                        tamanho={19}
                        className={ativo ? "text-[var(--color-accent-vivo)]" : ""}
                      />
                    </span>
                    <span className="lateral__rotulo flex-1 truncate">
                      {item.rotulo}
                    </span>
                    {contador ? (
                      <span
                        className={[
                          "lateral__contagem shrink-0 rounded-full px-1.5 py-px text-[0.625rem] font-600 tnum",
                          contagens?.[item.href]?.tom === "perigo"
                            ? "bg-[var(--color-perigo-fundo)] text-[var(--color-perigo)]"
                            : "bg-[var(--color-warn-fundo)] text-[var(--color-warn)]",
                        ].join(" ")}
                      >
                        {contador}
                      </span>
                    ) : null}
                  </Link>
                  <span className="lateral__dica" aria-hidden="true">
                    {item.rotulo}
                    {contador ? ` · ${contador}` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
}

function RodapeLateral({
  usuario,
  recolhida,
}: {
  usuario: Usuario;
  recolhida?: boolean;
}) {
  return (
    <div className="relative border-t border-[var(--vidro-fio)] px-3.5 py-3">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/8 text-[0.6875rem] font-600">
          {iniciais(usuario.nome)}
        </span>
        <div className="lateral__rotulo min-w-0 flex-1">
          <p className="truncate text-[0.8125rem] leading-tight">
            {usuario.nome}
          </p>
          <p className="truncate text-[0.6875rem] text-[var(--color-tinta-3)]">
            {rotuloPapel(usuario.papel)}
          </p>
        </div>
      </div>

      <form action={sair} className="mt-2.5">
        <button
          type="submit"
          className="lateral__item py-1.5"
          aria-label="Sair do sistema"
        >
          <span className="shrink-0">
            <Icone nome="sair" tamanho={18} />
          </span>
          <span className="lateral__rotulo text-[0.8125rem]">Sair</span>
        </button>
      </form>
    </div>
  );
}

const ROTAS: Record<string, string> = {
  painel: "Painel",
  clientes: "Clientes",
  demandas: "Demandas",
  documentos: "Documentos",
  financeiro: "Financeiro",
  orcamentos: "Orçamentos",
  contratos: "Contratos",
  conformidade: "Conformidade",
  config: "Configurações",
};

function TituloDaRota(caminho: string): string {
  const raiz = `/${caminho.split("/").filter(Boolean)[0] ?? "painel"}`;
  return ROTAS[raiz.slice(1)] ?? "Painel";
}