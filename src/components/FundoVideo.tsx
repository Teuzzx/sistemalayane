/**
 * Fundo cinematográfico do sistema.
 *
 * O arquivo original é um campo verde saturado com marca d'água de gerador
 * de imagem — repertório que a marca da Layane bane explicitamente
 * (DESIGN_DNA §10: "verde saturado de site ambiental", "ícones/folhas/planeta"
 * banidos, a diferenciação é a AUSÊNCIA desse repertório).
 *
 * A solução é não esconder o vídeo: é **reveir**. O pipeline CSS
 * dessatura, escurece e borra o suficiente para que o arquivo vire uma névoa
 * de território — a mesma leitura que dá nome à marca — em vez de uma foto
 * de campo. O movimento continua vivo atrás da interface, que é o que dá
 * profundidade ao vidro.
 *
 * Duas intensidades, e a diferença é intencional:
 *
 * - `sutil` (dentro do sistema): o fundo é ambiente. Fica atrás do dado e
 *   não pode competir com ele.
 * - `forte` (login): a tela não tem dado. O vídeo pode aparecer — é a
 *   primeira impressão da marca, e um fundo morto seria uma tela vazia.
 *
 * Três camadas, nesta ordem:
 *   1. gradiente de base (evita flash antes do vídeo carregar)
 *   2. o vídeo, com filtro
 *   3. véu de contraste — legibilidade acima de tudo
 */

export function FundoVideo({
  variante = "sutil",
}: {
  variante?: "sutil" | "forte";
}) {
  return (
    <div className="fundo" data-fundo={variante} aria-hidden="true">
      <video
        className="fundo__video"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        tabIndex={-1}
      >
        <source src="/video/territorio.mp4" type="video/mp4" />
      </video>

      <div className="fundo__veu" />
      <div className="fundo__vinheta" />
    </div>
  );
}