import { DocFolha } from "@/components/DocFolha";
import { dataPorExtenso } from "@/lib/dates";
import { brl } from "@/lib/money";
import { mascararDocumento } from "@/lib/utils";

/**
 * Documento imprimível do contrato.
 *
 * Estrutura de contrato de serviço: identificação, escopo, investimmento,
 * forma de pagamento, obrigações, confidencialidade e encerramento. Os
 * textos vêm do cadastro — a Layane escreve uma vez e o documento sai
 * montado.
 */
export function DocContrato({
  c,
  nomeCliente,
  cnpj,
  contato,
}: {
  c: {
    id: string;
    numero: string;
    titulo: string;
    inicio: string | null;
    fim: string | null;
    valorTotal: number;
    formaPagamento: string | null;
    parcelas: number;
    intervaloParcelasDias: number;
    escopo: string | null;
    investimento: string | null;
    formaDePagamentoTexto: string | null;
    obrigacoes: string | null;
    confidencialidade: string | null;
    rescisao: string | null;
    observacoes: string | null;
    assinadoEm: string | null;
  };
  nomeCliente: string;
  cnpj: string | null;
  contato: { nome: string | null; cargo: string | null } | null;
}) {
  const vigencia = c.fim
    ? `${dataPorExtenso(c.inicio)} a ${dataPorExtenso(c.fim)}`
    : c.inicio
      ? `a partir de ${dataPorExtenso(c.inicio)}`
      : "a definir";

  return (
    <DocFolha
      tipo="Contrato de Prestação de Serviços"
      titulo={c.numero}
      subtitulo={c.titulo}
      voltar={`/contratos/${c.id}`}
    >
      <section className="mb-7 text-[0.9375rem] leading-relaxed">
        <p>
          Pelo presente instrumento particular, de um lado{" "}
          <strong className="font-500">Layane Marques</strong>, gesture ambiental,
          doravante denominada <strong className="font-500">CONTRATANTE</strong>, e de
          outro lado <strong className="font-500">{nomeCliente}</strong>
          {cnpj ? `, inscrita no CNPJ sob nº ${mascararDocumento(cnpj)}` : ""}
          {contato?.nome ? `, representada por ${contato.nome}` : ""}, doravante
          denominada <strong className="font-500">CONTRATADA</strong>, resolvem
          celebrar o presente contrato de prestação de serviços ambientais, que se
          regerá pelas cláusulas e condições a seguir.
        </p>
      </section>

      <Secao titulo="1. Objeto" numero="1">
        {c.escopo ?? "Prestação de serviços de gestão ambiental conforme escopo anexo."}
      </Secao>

      <Secao titulo="2. Vigência" numero="2">
        Este contrato vigorá {vigencia}.
      </Secao>

      <Secao titulo="3. Investimento" numero="3">
        <p>
          Pela execução dos serviços ora pactuados, a CONTRATADA pagará à
          CONTRATANTE o valor total de <strong className="font-500 tnum">{brl(c.valorTotal)}</strong>.
        </p>
        {c.investimento && (
          <p className="mt-2 whitespace-pre-line">{c.investimento}</p>
        )}
      </Secao>

      <Secao titulo="4. Forma de pagamento" numero="4">
        <p>
          O pagamento será realizado em{" "}
          <strong className="font-500">
            {c.parcelas > 1 ? `${c.parcelas} parcelas` : " parcela única"}
          </strong>
          {c.parcelas > 1 && (
            <>
              {" "}
              com intervalo de <strong className="font-500">{c.intervaloParcelasDias} dias</strong> entre elas
            </>
          )}
          .
        </p>
        {c.formaDePagamentoTexto && (
          <p className="mt-2 whitespace-pre-line">{c.formaDePagamentoTexto}</p>
        )}
      </Secao>

      <Secao titulo="5. Obrigações da CONTRATANTE" numero="5">
        {c.obrigacoes ??
          "Executar os serviços com zelo, observância da legislação ambiental aplicável e da técnica ambiental vigente, entregando os artefatos pactuados nos prazos combinados."}
      </Secao>

      <Secao titulo="6. Obrigações da CONTRATADA" numero="6">
        {c.observacoes ??
          "Fornecer as informações e documentos necessários à execução dos serviços, indicar o interlocutor responsável pelas decisões e comunicar qualquer alteração na operação."}
      </Secao>

      <Secao titulo="7. Confidencialidade" numero="7">
        {c.confidencialidade ??
          "As partes obrigam-se a manter em sigilo as informações técnicas e comerciais recebidas em razão deste contrato, pelo prazo de 5 (cinco) anos contados do término da vigência."}
      </Secao>

      <Secao titulo="8. Rescisão" numero="8">
        {c.rescisao ??
          "Qualquer das partes poderá rescindir o contrato, mediante aviso prévio de 30 (trinta) dias. Em caso de inadimplemento, o contrato poderá ser rescindido imediatamente, sem prejuízo das perdas e danos cabíveis."}
      </Secao>

      <section className="mt-12">
        <p className="text-[0.875rem] text-muted">
          E por estarem justas e contratadas, firmam o presente instrumento em duas
          vias de igual teor.
        </p>

        <div className="mt-10 grid grid-cols-2 gap-10 text-[0.8125rem]">
          <div>
            <div className="h-14 border-b border-ink" />
            <p className="mt-2 font-500">Layane Marques</p>
            <p className="text-muted">Gestora Ambiental</p>
            <p className="text-muted">Contratante</p>
          </div>
          <div>
            <div className="h-14 border-b border-ink" />
            <p className="mt-2 font-500">{nomeCliente}</p>
            {contato?.nome && <p className="text-muted">{contato.nome}</p>}
            <p className="text-muted">Contratada</p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-10 text-[0.8125rem]">
          <div>
            <p className="text-muted">Local e data</p>
            <div className="mt-6 border-b border-ink" />
          </div>
          <div>
            <p className="text-muted">Assinatura reconhecida em cartório (se aplicável)</p>
            <div className="mt-6 border-b border-ink" />
          </div>
        </div>
      </section>
    </DocFolha>
  );
}

function Secao({
  numero,
  titulo,
  children,
}: {
  numero: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="doc-quebra-avoid mt-6">
      <h2 className="mb-2 text-[0.9375rem] font-600">
        {numero}. {titulo.replace(`${numero}. `, "")}
      </h2>
      <div className="text-[0.9375rem] leading-relaxed whitespace-pre-line text-ink">
        {children}
      </div>
    </section>
  );
}