import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FormularioLogin } from "@/components/FormularioLogin";
import { getUsuario } from "@/lib/auth";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaLogin() {
  if (await getUsuario()) redirect("/painel");

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Painel de marca — o verde da logo, com o sistema cartográfico
          atrás. Só login; o resto do sistema é papel. */}
      <section className="relative hidden overflow-hidden bg-deep px-12 py-14 lg:flex lg:flex-col lg:justify-between">
        <PlacaCartografica />

        <div className="relative">
          <p className="text-[1.35rem] leading-tight font-500 text-on-deep">
            Layane Marques
            <span className="font-accent ml-2">Gestão</span>
            <span className="ml-1.5 text-on-deep/72">Ambiental Aplicada</span>
          </p>
        </div>

        <div className="relative max-w-[46ch]">
          <p className="text-[2rem] leading-[1.12] font-500 tracking-[-0.01em] text-on-deep">
            Um só lugar para cliente, contrato e
            <span className="font-accent ml-1.5">caixa.</span>
          </p>
          <p className="mt-5 text-[0.9375rem] leading-relaxed text-on-deep/72">
            O ponto de encontro do seu trabalho: cadastro, histórico de
            atendimento, orçamento, contrato, conformidade e financeiro.
          </p>
        </div>

        <p className="index-num relative text-mineral-soft">
          S 06°13&apos; · W 42°49&apos; — PI
        </p>
      </section>

      {/* Formulário */}
      <section className="flex items-center justify-center px-6 py-14 sm:px-10">
        <div className="w-full max-w-[380px]">
          <div className="lg:hidden">
            <p className="text-[1.25rem] leading-tight font-500">
              Layane Marques
              <span className="font-accent ml-1.5">Gestão</span>
            </p>
            <p className="mt-0.5 text-[0.8125rem] text-muted">
              Gestão Ambiental Aplicada
            </p>
          </div>

          <h1 className="mt-8 text-[1.6rem] leading-tight font-500 tracking-[-0.008em] lg:mt-0">
            Entrar no sistema
          </h1>
          <p className="mt-1.5 mb-7 text-[0.9375rem] text-muted">
            Acesso restrito à equipe.
          </p>

          <FormularioLogin />

          <p className="mt-8 border-t border-line pt-4 text-[0.8125rem] text-faint">
            Problema para entrar? Fale com a Layane — ela restaura o acesso.
          </p>
        </div>
      </section>
    </main>
  );
}

/** Sistema cartográfico autoral: curvas de nível + ticks de coordenada. */
function PlacaCartografica() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full text-mineral-soft"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      <g stroke="currentColor" strokeWidth="1" fill="none" opacity="0.22">
        <path d="M-50 180 C 160 120, 320 240, 760 160" />
        <path d="M-50 240 C 180 180, 330 300, 760 220" />
        <path d="M-50 300 C 190 250, 340 360, 760 290" />
        <path d="M-50 360 C 200 320, 350 420, 760 360" />
        <path d="M-50 420 C 210 390, 360 480, 760 430" />
        <path d="M-50 480 C 220 460, 370 540, 760 500" />
        <path d="M-50 540 C 230 530, 380 600, 760 570" />
        <path d="M-50 600 C 240 600, 390 660, 760 640" />
      </g>
      <g stroke="currentColor" strokeWidth="1" opacity="0.32">
        {Array.from({ length: 24 }).map((_, i) => (
          <line
            key={i}
            x1={i * 60}
            y1={0}
            x2={i * 60 - 120}
            y2={900}
            opacity={i % 4 === 0 ? 0.9 : 0.35}
          />
        ))}
      </g>
    </svg>
  );
}