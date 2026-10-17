import type { Metadata, Viewport } from "next";
import { Barlow_Semi_Condensed } from "next/font/google";

import { BancoNaoConfigurado } from "@/components/BancoNaoConfigurado";
import { bancoConfigurado } from "@/db";

import "./globals.css";

const barlow = Barlow_Semi_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-barlow",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Sistema · Layane Marques",
    template: "%s · Layane Marques",
  },
  description: "Sistema interno de gestão da Layane Marques — Gestão Ambiental Aplicada.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#3a472d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={barlow.variable}>
      <body className="min-h-dvh antialiased">
        {/*
          Sem `DATABASE_URL` toda rota morria — a tela de login, inclusive
          — e a Vercel devolvia um 500 sem texto nenhum. A pessoa via um
          número e nenhuma pista do que fazer. Aqui o caso conhecido vira
          uma tela que diz o que está faltando.
        */}
        {bancoConfigurado ? children : <BancoNaoConfigurado />}
      </body>
    </html>
  );
}