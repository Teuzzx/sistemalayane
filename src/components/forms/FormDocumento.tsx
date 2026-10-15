"use client";

import { useActionState } from "react";

import { salvarDocumento, type Estado } from "@/actions/demandas";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { Icone } from "@/components/Icone";
import { Aviso, Campo } from "@/components/ui";
import { hoje } from "@/lib/dates";

const TIPOS = [
  "Licença de Operação",
  "Licença de Instalação",
  "Autorização de Operação",
  "Isenção de licenciamento",
  "CAR — Cadastro Ambiental Rural",
  "Certidão de débitos",
  "Laudo / relatório",
  "Outorga de água",
  "Alvará",
];

export function FormDocumento({
  clienteId,
  clientes = [],
  documento,
}: {
  clienteId?: string;
  clientes?: { id: string; nome: string }[];
  documento?: {
    id: string;
    clienteId: string;
    nome: string;
    tipo: string | null;
    orgao: string | null;
    numero: string | null;
    emissao: string | null;
    validade: string | null;
    status: string;
    observacoes: string | null;
  };
}) {
  const [estado, acao] = useActionState<Estado, FormData>(salvarDocumento, {});

  return (
    <form action={acao} className="flex flex-col gap-5">
      {documento?.id && <input type="hidden" name="id" value={documento.id} />}

      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.ok && <Aviso tipo="ok">{estado.ok}</Aviso>}

      {!clienteId && (
        <Campo rotulo="Cliente" htmlFor="clienteId" obrigatorio>
          <select
            id="clienteId"
            name="clienteId"
            required
            defaultValue={documento?.clienteId ?? ""}
            className="field"
          >
            <option value="">Selecione…</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </Campo>
      )}
      {clienteId && <input type="hidden" name="clienteId" value={clienteId} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Documento" htmlFor="nome" obrigatorio>
          <input
            id="nome"
            name="nome"
            required
            defaultValue={documento?.nome ?? ""}
            className="field"
            placeholder="Ex.: Licença de Operação 2026"
          />
        </Campo>

        <Campo rotulo="Tipo" htmlFor="tipo">
          <select id="tipo" name="tipo" defaultValue={documento?.tipo ?? ""} className="field">
            <option value="">—</option>
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Campo>

        <Campo rotulo="Órgão emissor" htmlFor="orgao">
          <input
            id="orgao"
            name="orgao"
            defaultValue={documento?.orgao ?? ""}
            className="field"
            placeholder="Ex.: SEMAT / IBAMA / prefeitura"
          />
        </Campo>

        <Campo rotulo="Número do documento" htmlFor="numero">
          <input
            id="numero"
            name="numero"
            defaultValue={documento?.numero ?? ""}
            className="field"
          />
        </Campo>

        <Campo rotulo="Emissão" htmlFor="emissao">
          <input
            id="emissao"
            name="emissao"
            type="date"
            defaultValue={documento?.emissao ?? ""}
            className="field"
          />
        </Campo>

        <Campo
          rotulo="Validade"
          htmlFor="validade"
          dica="O painel avisa 60 dias antes."
        >
          <input
            id="validade"
            name="validade"
            type="date"
            defaultValue={documento?.validade ?? ""}
            className="field"
          />
        </Campo>

        <Campo rotulo="Situação" htmlFor="status">
          <select id="status" name="status" defaultValue={documento?.status ?? "valido"} className="field">
            <option value="valido">Válido</option>
            <option value="a_vencer">A vencer</option>
            <option value="vencido">Vencido</option>
            <option value="nao_aplicavel">Não se aplica</option>
          </select>
        </Campo>
      </div>

      <Campo rotulo="Observações" htmlFor="observacoes">
        <textarea
          id="observacoes"
          name="observacoes"
          rows={3}
          defaultValue={documento?.observacoes ?? ""}
          className="field"
        />
      </Campo>

      <BotaoEnviar variante="primario">
        {documento?.id ? "Salvar documento" : "Registrar documento"}
        <Icone nome="seta" tamanho={16} className="seta" />
      </BotaoEnviar>
    </form>
  );
}