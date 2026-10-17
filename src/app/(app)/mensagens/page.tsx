/**
 * Central de Mensagens.
 *
 * Não é um "log de e-mail" — é onde a Layane trabalha a conversa. Tudo
 * que ela manda e toda resposta do cliente entra aqui, ligado pelo
 * mesmo `threadId`, para o histórico não depender de alguém procurar
 * um e-mail perdido na caixa dela.
 *
 * A tela tem duas-metades de propósito:
 *
 * - **acima**, o formulário de envio avulso (a "envio imediato" que ela
 *   pediu): escolhe o cliente e manda agora;
 * - **abaixo**, o histórico filtrável por status, com reenvio das que
 *   falharam.
 */

import { Suspense } from "react";
import { exigirSecao } from "@/lib/exigir";

import { FormularioMensagem } from "@/components/FormularioMensagem";
import { PainelCobranca } from "@/components/PainelCobranca";
import { reenviar } from "@/actions/mensagens";
import {
  Aviso,
  Botao,
  CabecalhoPagina,
  Etiqueta,
  Painel,
  Vazio,
  type Tom,
} from "@/components/ui";
import { requireUsuario } from "@/lib/auth";
import { contarPorStatus, listarMensagens } from "@/lib/consultasMensagens";
import { statusDoProvedor } from "@/lib/consultasMensagens";
import { formatarData } from "@/lib/dates";
import { db } from "@/db";
import { clientes } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import type { MensagemTipo, StatusEnvio } from "@/db/schema";
import { rotulosMensagem } from "@/db/schema";
import { pluralizar } from "@/lib/utils";

export const metadata = { title: "Mensagens" };

const ROTULO_STATUS: Record<StatusEnvio, string> = {
  rascunho: "Rascunho",
  fila: "Na fila",
  enviando: "Enviando",
  enviado: "Enviado",
  falhou: "Falhou",
  lido: "Lido",
  respondido: "Respondido",
};

const TOM_STATUS: Record<StatusEnvio, Tom> = {
  rascunho: "mute",
  fila: "warn",
  enviando: "warn",
  enviado: "ok",
  falhou: "danger",
  lido: "info",
  respondido: "ok",
};

const FILTROS: { chave: string; rotulo: string }[] = [
  { chave: "todas", rotulo: "Todas" },
  { chave: "falhou", rotulo: "Falhas" },
  { chave: "rascunho", rotulo: "Rascunhos" },
  { chave: "enviado", rotulo: "Enviadas" },
  { chave: "respondido", rotulo: "Respondidas" },
];

export default async function PaginaMensagens({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; tipo?: string }>;
}) {
  await exigirSecao("mensagens");

  const usuario = await requireUsuario();
  const params = await searchParams;

  const statusFiltro = (params.status ?? "todas") as StatusEnvio | "todas";
  const tipoFiltro = (params.tipo ?? "todos") as MensagemTipo | "todos";

  const [lista, contagens, provedor, todosClientes] = await Promise.all([
    listarMensagens({ status: statusFiltro, tipo: tipoFiltro }),
    contarPorStatus(),
    statusDoProvedor(),
    db
      .select({
        id: clientes.id,
        nome: clientes.nome,
        email: clientes.contatoEmail,
      })
      .from(clientes)
      .where(eq(clientes.status, "ativo"))
      .orderBy(asc(clientes.nome)),
  ]);

  const comEmail = todosClientes.filter((c) => c.email);

  return (
    <>
      <CabecalhoPagina
        titulo="Mensagens"
        eyebrow="Atendimento"
        descricao="Cobrança, contratos e avisos — tudo que sai daqui fica registrado, com o que foi enviado e o que o cliente respondeu."
      />

      {!provedor.configurado && (
        <div className="mb-6">
          <Aviso tipo="erro">
            <strong>Nenhum e-mail está saindo ainda.</strong> O sistema está
            pronto, mas falta a chave do Resend. Sem ela, tudo que você enviar
            fica guardado como rascunho aqui, para você revisar o texto antes.
            A configuração fica em <strong>Configurações › E-mail</strong>.
          </Aviso>
        </div>
      )}

      <div className="grid gap-6">
        <FormularioMensagem clientes={comEmail} aberto={false} />

        <Suspense fallback={null}>
          <PainelCobranca />
        </Suspense>

        <Painel
          titulo="Conversas"
          descricao={`${pluralizar(lista.length, "registro", "registros")}`}
          solido
          acoes={
            <nav className="flex flex-wrap gap-1.5" aria-label="Filtrar por status">
              {FILTROS.map((f) => {
                const ativo = statusFiltro === f.chave;
                const n =
                  f.chave === "todas"
                    ? Object.values(contagens).reduce((s, x) => s + x, 0)
                    : contagens[f.chave] ?? 0;
                return (
                  <a
                    key={f.chave}
                    href={f.chave === "todas" ? "/mensagens" : `/mensagens?status=${f.chave}`}
                    aria-current={ativo ? "page" : undefined}
                    className={[
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[0.6875rem] font-600 transition-colors",
                      ativo
                        ? "border-[var(--vidro-fio-forte)] bg-[rgba(244,241,232,0.08)] text-bright"
                        : "border-[var(--vidro-fio)] text-muted hover:text-bright",
                    ].join(" ")}
                  >
                    {f.rotulo}
                    {n > 0 && <span className="tnum opacity-60">{n}</span>}
                  </a>
                );
              })}
            </nav>
          }
        >
          {lista.length === 0 ? (
            <Vazio
              titulo="Nada por aqui ainda"
              texto="Quando você enviar uma cobrança, um contrato ou um aviso, ele aparece nesta lista com a data e o resultado."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Para</th>
                    <th>Assunto</th>
                    <th>Tipo</th>
                    <th>Status</th>
                    <th>Quando</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {lista.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <span className="block text-bright">{m.clienteNome ?? m.paraNome ?? "—"}</span>
                        <span className="block text-[0.75rem] text-faint">{m.paraEmail}</span>
                      </td>
                      <td className="max-w-[28ch]">{m.assunto}</td>
                      <td>
                        <Etiqueta tom="mute">{rotulosMensagem[m.tipo]}</Etiqueta>
                      </td>
                      <td>
                        <Etiqueta tom={TOM_STATUS[m.status]}>{ROTULO_STATUS[m.status]}</Etiqueta>
                        {m.status === "falhou" && m.ultimoErro && (
                          <span className="mt-1 block max-w-[32ch] text-[0.6875rem] leading-snug text-faint">
                            {m.ultimoErro}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap tnum text-[0.8125rem]">
                        {formatarData(m.enviadoEm ?? m.criadoEm)}
                      </td>
                      <td>
                        {m.status === "falhou" && (
                          <form action={reenviar}>
                            <input type="hidden" name="id" value={m.id} />
                            <Botao type="submit" variante="fantasma" className="px-2 py-1 text-[0.75rem]">
                              Reenviar
                            </Botao>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Painel>
      </div>

      <p className="sr-only">Sessão de {usuario.nome}</p>
    </>
  );
}
