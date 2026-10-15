"use client";

import { useActionState } from "react";

import { entrar, type EstadoForm } from "@/actions/auth";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { Icone } from "@/components/Icone";
import { Aviso, Campo } from "@/components/ui";

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

      <BotaoEnviar className="mt-1 w-full">
        Entrar
        <Icone nome="seta" tamanho={16} className="seta" />
      </BotaoEnviar>
    </form>
  );
}