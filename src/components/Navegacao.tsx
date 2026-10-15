"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Icone, type NomeIcone } from "./Icone";
import { sair } from "@/actions/auth";
import { ehAdmin, rotuloPapel } from "@/lib/papeis";
import type { Usuario } from "@/db/schema";
import { iniciais } from "@/lib/utils";

type Item = {
  href: string;
  rotulo: string;
  icone: NomeIcone;
  /** Só a Layane vê. */
  admin?: boolean;
  /** Badge com contagem (documentos a vencer, por exemplo). */
  contagem?: number;
  tom?: "danger" | "warn";
};

export function Navegacao({
  usuario,
  contagens,
}: {
  usuario: Usuario;
  contagens?: Record<string, { n: number; tom: "danger" | "warn" }>;
}) {
  const [aberta, setAberta] = useState(false);
  const caminho = usePathname();

  useEffect(() => {
    setAberta(false);
  }, [caminho]);

  const itens: Item[] = [
    { href: "/painel", rotulo: "Painel", icone: "painel" },
    { href: "/clientes", rotulo: "Clientes", icone: "clientes" },
    { href: "/demandas", rotulo: "Demandas", icone: "demandas" },
    { href: "/documentos", rotulo: "Documentos", icone: "documentos" },
    { href: "/financeiro", rotulo: "Financeiro", icone: "financeiro" },
    { href: "/orcamentos", rotulo: "Orçamentos", icone: "orcamentos" },
    { href: "/contratos", rotulo: "Contratos", icone: "contratos" },
    {
      href: "/conformidade",
      rotulo: "Conformidade",
      icone: "conformidade",
      admin: true,
    },
    { href: "/config", rotulo: "Configurações", icone: "config", admin: true },
  ];

  const visiveis = itens.filter((i) => !i.admin || ehAdmin(usuario));

  return (
    <>
      {/* Botão de menu — só no mobile */}
      <div className="nao-imprimir sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line bg-paper/92 px-4 py-2.5 backdrop-blur-md lg:hidden">
        <Link href="/painel" className="flex items-baseline">
          <span className="text-[0.9375rem] font-500">Layane Marques</span>
        </Link>
        <button
          type="button"
          onClick={() => setAberta((v) => !v)}
          aria-expanded={aberta}
          aria-label={aberta ? "Fechar menu" : "Abrir menu"}
          className="flex items-center gap-2 rounded-full border border-line-strong px-3 py-1.5 text-[0.6875rem] font-600 uppercase tracking-[0.14em]"
        >
          <Icone nome={aberta ? "fechar" : "menu"} tamanho={16} />
          {aberta ? "Fechar" : "Menu"}
        </button>
      </div>

      {aberta && (
        <div className="nao-imprimir fixed inset-0 top-[49px] z-20 bg-deep/97 px-4 py-4 lg:hidden">
          <ListaNavigation
            itens={visiveis}
            caminho={caminho}
            usuario={usuario}
            contagens={contagens}
          />
        </div>
      )}

      {/* Barra lateral — fixa, verde da marca. */}
      <aside className="nao-imprimir fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col bg-deep lg:flex">
        <div className="flex flex-col gap-0.5 px-4 pt-6 pb-5">
          <p className="text-[1.0625rem] leading-tight font-500 text-on-deep">
            Layane Marques
            <span className="font-accent ml-1.5">Gestão</span>
          </p>
          <p className="mt-0.5 text-[0.75rem] text-on-deep/60">
            Gestão Ambiental Aplicada
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3">
          <ListaNavigation
            itens={visiveis}
            caminho={caminho}
            usuario={usuario}
            contagens={contagens}
          />
        </nav>

        <div className="border-t border-line-deep px-4 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-on-deep/12 text-[0.75rem] font-600 text-on-deep">
              {iniciais(usuario.nome)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.8125rem] text-on-deep">
                {usuario.nome}
              </p>
              <p className="truncate text-[0.6875rem] text-on-deep/55">
                {rotuloPapel(usuario.papel)}
              </p>
            </div>
          </div>
          <form action={sair} className="mt-3">
            <button
              type="submit"
              className="flex items-center gap-2 text-[0.75rem] text-on-deep/60 transition-colors duration-150 hover:text-on-deep"
            >
              <Icone nome="sair" tamanho={16} />
              Sair
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}

function ListaNavigation({
  itens,
  caminho,
  usuario,
  contagens,
}: {
  itens: Item[];
  caminho: string;
  usuario: Usuario;
  contagens?: Record<string, { n: number; tom: "danger" | "warn" }>;
}) {
  return (
    <ul className="flex flex-col gap-0.5">
      {itens.map((item) => {
        const ativo =
          caminho === item.href || caminho.startsWith(`${item.href}/`);
        const contador = contagens?.[item.href]?.n;

        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={ativo ? "page" : undefined}
              className={[
                "flex items-center gap-2.5 rounded-xs px-3 py-2 text-[0.8125rem] transition-colors duration-150",
                ativo
                  ? "bg-on-deep/12 text-on-deep"
                  : "text-on-deep/60 hover:bg-on-deep/8 hover:text-on-deep",
              ].join(" ")}
            >
              <Icone nome={item.icone} tamanho={17} />
              <span className="flex-1">{item.rotulo}</span>
              {contador ? (
                <span
                  className={[
                    "rounded-full px-1.5 py-px text-[0.6875rem] font-600 tnum",
                    contagens?.[item.href]?.tom === "danger"
                      ? "bg-danger text-on-deep"
                      : "bg-mineral-soft text-deep",
                  ].join(" ")}
                >
                  {contador}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}