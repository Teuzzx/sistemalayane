"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { entrar, type EstadoForm } from "@/actions/auth";
import { Icone } from "@/components/Icone";
import { Aviso, Campo } from "@/components/ui";

/**
 * Formulário de login.
 *
 * O botão entra em estado de carregamento pelo tempo INTEIRO entre o clique
 * e a chegada no painel: o `redirect()` acontece dentro da Server Action,
 * então o `pending` do `useFormStatus` cobre a navegação também. Sem isso a
 * pessoa apertava "Entrar" e via a tela piscar sem explicação nenhuma.
 *
 * O botão vive num componente separado porque `useFormStatus` só funciona
 * DENTRO de um `<form>` já renderizado — não dá para usar no mesmo
 * componente que declara o form.
 */
export function FormularioLogin() {
  const [estado, acao] = useActionState<EstadoForm, FormData>(entrar, {});

  return (
    <form action={acao} className="flex flex-col gap-4">
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}

      <Campo rotulo="E-mail" htmlFor="email" obrigatorio>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          className="field"
          placeholder="voce@layanemarques.com.br"
        />
      </Campo>

      <Campo rotulo="Senha" htmlFor="senha" obrigatorio>
        <input
          id="senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          className="field"
        />
      </Campo>

      <BotaoEntrar />
    </form>
  );
}

function BotaoEntrar() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="btn btn-primario mt-1 w-full"
    >
      {pending ? (
        <>
          <Girando />
          Entrando…
        </>
      ) : (
        <>
          Entrar
          <Icone nome="seta" tamanho={16} className="seta" />
        </>
      )}
    </button>
  );
}

/** Anel girando no lugar da seta — o sinal de "está acontecendo". */
function Girando() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="girando"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.3"
        strokeWidth="2.6"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}