"use client";

import { useActionState } from "react";

import { criarUsuario, trocarMinhaSenha, type EstadoForm as Estado } from "@/actions/auth";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { CampoSenha } from "@/components/CampoSenha";
import { Icone } from "@/components/Icone";
import { Aviso, Campo } from "@/components/ui";

export function FormNovoUsuario() {
  const [estado, acao] = useActionState<Estado, FormData>(criarUsuario, {});

  return (
    <form action={acao} className="flex flex-col gap-4">
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Campo rotulo="Nome" htmlFor="nome" obrigatorio>
          <input id="nome" name="nome" required className="field" />
        </Campo>

        <Campo rotulo="E-mail" htmlFor="email" obrigatorio>
          <input id="email" name="email" type="email" required className="field" />
        </Campo>

        <Campo rotulo="Cargo" htmlFor="cargo">
          <input id="cargo" name="cargo" className="field" placeholder="Administrativo" />
        </Campo>

        <CampoSenha nome="senha" rotulo="Senha inicial" obrigatorio />

        <Campo rotulo="Papel" htmlFor="papel" className="lg:col-span-2">
          <select id="papel" name="papel" defaultValue="assistente" className="field">
            <option value="assistente">
              Assistente — clientes, atendimento e financeiro
            </option>
            <option value="admin">
              Administradora — acesso total, incluindo conformidade
            </option>
          </select>
        </Campo>
      </div>

      <BotaoEnviar variante="secundario">
        Criar acesso
        <Icone nome="mais" tamanho={15} />
      </BotaoEnviar>
    </form>
  );
}

export function FormTrocaSenha() {
  const [estado, acao] = useActionState<Estado, FormData>(trocarMinhaSenha, {});

  return (
    <form action={acao} className="flex flex-wrap items-end gap-3">
      {estado.erro && (
        <div className="w-full">
          <Aviso tipo="erro">{estado.erro}</Aviso>
        </div>
      )}
      {estado.ok && (
        <div className="w-full">
          <Aviso tipo="ok">{estado.ok}</Aviso>
        </div>
      )}

      <Campo rotulo="Senha atual" htmlFor="atual" obrigatorio className="w-[200px]">
        <input
          id="atual"
          name="atual"
          type="password"
          required
          autoComplete="current-password"
          className="field"
        />
      </Campo>

      <div className="w-[240px]">
        <CampoSenha nome="nova" rotulo="Nova senha" obrigatorio />
      </div>

      <BotaoEnviar variante="secundario">Trocar senha</BotaoEnviar>
    </form>
  );
}
