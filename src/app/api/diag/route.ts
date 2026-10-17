import { NextResponse } from "next/server";

/**
 * Diagnóstico temporário — some depois.
 *
 * A tela de login abre (nenhuma consulta ao banco) e o POST dela volta
 * 500. Isso aponta conexão, mas não diz qual falha. Esta rota pergunta
 * ao Postgres de dentro da Vercel e devolve o erro verdadeiro.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function alvo() {
  const bruto = process.env.DATABASE_URL ?? "";
  try {
    const u = new URL(bruto);
    return { host: u.hostname, port: u.port || "5432", user: u.username };
  } catch {
    return { host: "(nao parseia)", port: "?", user: "?" };
  }
}

export async function GET() {
  const t = alvo();
  const relatorio: Record<string, unknown> = {
    quando: new Date().toISOString(),
    host: t.host,
    porta: t.port,
    usuario: t.user,
    ipv6_suportado: process.env.VERCEL === "1" ? "rodando na Vercel" : "local",
  };

  // 1) o processo consegue abrir socket no host?
  try {
    const dns = await import("node:dns/promises");
    relatorio.dns_ipv4 = await dns.resolve4(t.host);
  } catch (e) {
    relatorio.dns_ipv4 = `falhou: ${(e as Error).message}`;
  }
  try {
    const dns = await import("node:dns/promises");
    relatorio.dns_ipv6 = await dns.resolve6(t.host);
  } catch (e) {
    relatorio.dns_ipv6 = `falhou: ${(e as Error).message}`;
  }

  // 2) a consulta de verdade responde?
  try {
    const { db } = await import("@/db");
    const { usuarios } = await import("@/db/schema");
    const r = await db.select().from(usuarios).limit(1);
    relatorio.consulta = `OK — ${r.length} linha(s)`;
  } catch (e) {
    const err = e as Error & { cause?: Error; code?: string };
    relatorio.consulta = "FALHOU";
    relatorio.erro_nome = err.name;
    relatorio.erro_codigo = err.code ?? (err.cause as { code?: string })?.code;
    relatorio.erro_mensagem = (err.message || "").slice(0, 300);
    relatorio.erro_causa = (err.cause as Error)?.message?.slice(0, 300);
  }

  return NextResponse.json(relatorio, { status: 200 });
}