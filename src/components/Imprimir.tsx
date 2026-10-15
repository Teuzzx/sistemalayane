"use client";

import { Icone } from "@/components/Icone";

/** Abre o diálogo de impressão — vira PDF pelo "Salvar como PDF". */
export function Imprimir({ rotulo = "Imprimir / PDF" }: { rotulo?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-primario">
      <Icone nome="imprimir" tamanho={16} />
      {rotulo}
    </button>
  );
}