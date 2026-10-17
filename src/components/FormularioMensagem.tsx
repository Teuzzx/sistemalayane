"use client";

/**
 * Envio de mensagem — formulário com estado de pendência.
 *
 * Por que componente cliente quando a action já resolve tudo: o
 * `<button>` precisa desabilitar e mostrar "Enviando…" durante a ida ao
 * servidor. Sem isso a Layane clica duas vezes e manda a mesma cobrança
 * duas vezes — que é exatamente o defeito que a fila e o intervalo
 * mínimo tentam evitar.
 *
 * O `useFormStatus` vem do próprio `react-dom`, sem biblioteca.
 */

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { enviarMensagem, type EstadoEnvio } from "@/actions/mensagens";
import { Botao, Campo } from "@/components/ui";
import type { MensagemTipo } from "@/db/schema";
import { rotulosMensagem } from "@/db/schema";

const ESTADO_INICIAL: EstadoEnvio = {};

const TIPOS: MensagemTipo[] = [
  "cobranca",
  "contrato",
  "orcamento",
  "conformidade",
  "documento",
  "aviso",
  "atendimento",
];

function Enviar() {
  const { pending } = useFormStatus();
  return (
    <Botao type="submit" variante="primario" disabled={pending}>
      {pending ? "Enviando…" : "Enviar agora"}
    </Botao>
  );
}

function SalvarRascunho() {
  const { pending } = useFormStatus();
  return (
    <Botao type="submit" variante="secundario" disabled={pending} name="rascunho" value="sim">
      {pending ? "Salvando…" : "Salvar rascunho"}
    </Botao>
  );
}

export function FormularioMensagem({
  clientes,
  aberto,
}: {
  clientes: { id: string; nome: string; email: string | null }[];
  /** Começa fechado: a lista de mensagens é o conteúdo, não o formulário. */
  aberto: boolean;
}) {
  const [estado, formAction] = useActionState(enviarMensagem, ESTADO_INICIAL);
  const [visivel, setVisivel] = useState(aberto);
  const form = useRef<HTMLFormElement>(null);

  /* Sucesso limpa o formulário. Sem isso a próxima cobrança sai com o
     nome e o valor do cliente anterior, e ninguém percebe até o cliente
     reclamar. */
  const mandou = estado.ok && !estado.erro;
  useEffect(() => {
    if (mandou) form.current?.reset();
  }, [mandou]);

  return (
    <section className="painel" aria-labelledby="titulo-nova-mensagem">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="titulo-nova-mensagem" className="text-[0.9375rem] font-600">
            Enviar mensagem
          </h2>
          <p className="mt-1 text-[0.8125rem] text-muted">
            Vai para o e-mail do contato. Quem responder, você registra na
            conversa.
          </p>
        </div>

        <Botao
          type="button"
          variante="fantasma"
          onClick={() => setVisivel((v) => !v)}
          aria-expanded={visivel}
          aria-controls="form-mensagem"
        >
          {visivel ? "Fechar" : "Nova mensagem"}
        </Botao>
      </header>

      {visivel && (
        <form ref={form} action={formAction} id="form-mensagem" className="mt-5 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Cliente" htmlFor="clienteId" obrigatorio>
              <select id="clienteId" name="clienteId" required className="field" defaultValue="">
                <option value="" disabled>
                  Escolha o cliente
                </option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id} disabled={!c.email}>
                    {c.email ? `${c.nome} — ${c.email}` : `${c.nome} (sem e-mail)`}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo rotulo="Assunto" htmlFor="assunto" obrigatorio>
              <input
                id="assunto"
                name="assunto"
                required
                className="field"
                placeholder="Cobrança de R$ 1.500,00"
              />
            </Campo>
          </div>

          <Campo rotulo="Tipo" htmlFor="tipo">
            <select id="tipo" name="tipo" className="field" defaultValue="atendimento">
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {rotulosMensagem[t]}
                </option>
              ))}
            </select>
          </Campo>

          <Campo
            rotulo="Mensagem"
            htmlFor="corpo"
            obrigatorio
            dica="Assunto e corpo aparecem exatamente como você escrever."
          >
            <textarea
              id="corpo"
              name="corpo"
              required
              rows={8}
              className="field min-h-[9rem] resize-y"
              placeholder="Olá, Ana!"
            />
          </Campo>

          {estado.erro && (
            <p role="alert" className="text-[0.8125rem] text-danger">
              {estado.erro}
            </p>
          )}
          {estado.ok && (
            <p role="status" className="text-[0.8125rem] text-ok">
              {estado.ok}
            </p>
          )}
          {estado.detalhe && (
            <p className="text-[0.75rem] text-muted">{estado.detalhe}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <Enviar />
            <SalvarRascunho />
          </div>
        </form>
      )}
    </section>
  );
}
