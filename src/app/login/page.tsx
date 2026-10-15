import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FundoVideo } from "@/components/FundoVideo";
import { FormularioLogin } from "@/components/FormularioLogin";
import { getUsuario } from "@/lib/auth";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaLogin() {
  if (await getUsuario()) redirect("/painel");

  return (
    <div className="relative min-h-dvh">
      <FundoVideo variante="forte" />

      <main className="relative z-10 grid min-h-dvh lg:grid-cols-[1.15fr_1fr]">
        {/* Painel de marca */}
        <section className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-14">
          <PlaCartografica />

          <div className="relative">
            <Selo />
          </div>

          <div className="relative max-w-[46ch]">
            <p className="text-[2.4rem] leading-[1.08] font-500 tracking-[-0.014em]">
              Um só lugar para cliente, contrato e{" "}
              <span className="font-accent">caixa.</span>
            </p>
            <p className="mt-5 text-[0.9375rem] leading-relaxed text-muted">
              O ponto de encontro do seu trabalho: cadastro, histórico de
              atendimento, orçamento, contrato, conformidade e financeiro.
            </p>
          </div>

          <p
            className="relative text-[0.6875rem] tracking-[0.22em] text-[var(--color-tinta-4)] uppercase"
            aria-hidden="true"
          >
            S 06°13′ · W 42°49′ — PI
          </p>
        </section>

        {/* Formulário — vidro, porque é o que a pessoa opera */}
        <section className="flex items-center justify-center px-5 py-16 sm:px-10">
          <div className="w-full max-w-[400px]">
            <div className="lg:hidden">
              <Selo />
            </div>

            <h1 className="mt-9 text-[1.75rem] leading-none font-500 tracking-[-0.012em] lg:mt-0">
              Entrar
            </h1>
            <p className="mt-2.5 mb-7 text-[0.875rem] text-muted">
              Acesso restrito à equipe.
            </p>

            <div className="painel p-5 sm:p-6">
              <FormularioLogin />
            </div>

            <p className="mt-6 text-[0.8125rem] leading-relaxed text-faint">
              Problema para entrar? Fale com a Layane — ela restaura o acesso.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

/** Selo da marca — vidro com reflexo, o monograma da logo. */
function Selo() {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#a9c48a] to-[#6f8a55] text-[0.9375rem] font-700 text-[#14190f] shadow-[0_1px_0_rgba(255,255,255,0.35)_inset,0_3px_14px_rgba(134,169,106,0.32)]">
        LM
      </span>
      <span>
        <span className="block text-[1.0625rem] leading-tight font-500">
          Layane Marques
          <span className="font-accent ml-1.5">Gestão</span>
        </span>
        <span className="block text-[0.75rem] text-muted">
          Gestão Ambiental Aplicada
        </span>
      </span>
    </div>
  );
}

/**
 * Sistema cartográfico autoral: curvas de nível + ticks de coordenada.
 * Só o wireframe — o resto da identidade está no vidro e no vídeo.
 */
function PlaCartografica() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full text-[var(--color-mineral)]"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      <g stroke="currentColor" strokeWidth="1" fill="none" opacity="0.14">
        <path d="M-50 200 C 180 130, 340 260, 820 170" />
        <path d="M-50 270 C 200 200, 350 330, 820 240" />
        <path d="M-50 340 C 210 280, 360 400, 820 310" />
        <path d="M-50 410 C 220 360, 370 470, 820 390" />
        <path d="M-50 480 C 230 440, 380 540, 820 470" />
        <path d="M-50 550 C 240 520, 390 610, 820 550" />
        <path d="M-50 620 C 250 600, 400 680, 820 630" />
      </g>
      <g stroke="currentColor" strokeWidth="1" opacity="0.1">
        {Array.from({ length: 24 }).map((_, i) => (
          <line
            key={i}
            x1={i * 60}
            y1={0}
            x2={i * 60 - 120}
            y2={900}
            opacity={i % 4 === 0 ? 0.9 : 0.3}
          />
        ))}
      </g>
    </svg>
  );
}