import type { Metadata, Viewport } from "next";
import { Barlow_Semi_Condensed } from "next/font/google";

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
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}