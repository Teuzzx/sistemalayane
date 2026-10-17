"use client";

/**
 * Campo de senha com medidor de força.
 *
 * O medidor é o que transforma "senha fraca" de erro de servidor em
 * coisa que a pessoa vê enquanto digita. Sem ele, a única forma de
 * descobrir o que falta é mandar o formulário e ler a recusa — e nesse
 * intervalo as pessoas costumam escolher a primeira senha que passa.
 *
 * A regra vive em `@/lib/senha`, sem `server-only`, então é a mesma
 * função que roda no servidor. Divergir as duas é como nasce um campo
 * que aceita no navegador e recusa depois.
 */

import { useId, useState } from "react";

import { Campo } from "@/components/ui";
import { avaliarSenha, rotuloForca } from "@/lib/senha";

const CORES = [
  "bg-danger",
  "bg-danger",
  "bg-warn",
  "bg-ok",
  "bg-ok",
] as const;

export function CampoSenha({
  nome,
  rotulo,
  obrigatorio = false,
  autoComplete = "new-password",
  placeholder,
}: {
  nome: string;
  rotulo: string;
  obrigatorio?: boolean;
  autoComplete?: string;
  placeholder?: string;
}) {
  const [senha, setSenha] = useState("");
  const id = useId();
  const idDica = useId();

  /* Não avalia campo vazio: a barra zerada de "você ainda não digitou
     nada" lê como reprovação e desmotiva antes da pessoa começar. */
  const avaliada = senha.length > 0 ? avaliarSenha(senha) : null;

  return (
    <Campo
      rotulo={rotulo}
      htmlFor={id}
      obrigatorio={obrigatorio}
      dica={avaliada ? undefined : "Pelo menos 10 caracteres, com maiúscula e número."}
    >
      <input
        id={id}
        name={nome}
        type="password"
        required={obrigatorio}
        autoComplete={autoComplete}
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        aria-describedby={avaliada ? idDica : undefined}
        className="field"
        placeholder={placeholder}
      />

      {avaliada && (
        <div id={idDica} className="mt-1.5 flex flex-col gap-1.5">
          <div className="flex gap-1" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={[
                  "h-[3px] flex-1 rounded-full transition-colors duration-200",
                  i < avaliada.nota ? CORES[avaliada.nota] : "bg-[var(--vidro-fio)]",
                ].join(" ")}
              />
            ))}
          </div>

          <p className="text-[0.75rem] leading-relaxed">
            <span
              className={[
                "font-600",
                avaliada.nota <= 1
                  ? "text-danger"
                  : avaliada.nota === 2
                    ? "text-warn"
                    : "text-ok",
              ].join(" ")}
            >
              {rotuloForca(avaliada.nota)}
            </span>
            {avaliada.problemas.length > 0 && (
              <span className="text-faint"> — {avaliada.problemas.join(" ")}</span>
            )}
          </p>
        </div>
      )}
    </Campo>
  );
}
