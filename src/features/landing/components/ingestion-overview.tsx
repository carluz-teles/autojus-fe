import {
  ArrowDown,
  BellRing,
  Check,
  FileText,
  FolderOpen,
  Layers3,
  Radar,
} from "lucide-react";

export function IngestionOverview() {
  return (
    <section
      className="lp-ingestion lp-section lp-container"
      id="acervo"
      aria-labelledby="lp-ingestion-title"
    >
      <div className="lp-ingestion-copy">
        <span className="lp-eyebrow">
          <span className="lp-section-index">01 /</span> CAPTURA AUTOMÁTICA,
          TODOS OS DIAS
        </span>
        <h2 id="lp-ingestion-title">
          O processo anda.
          <br />
          <em>A informação chega.</em>
        </h2>
        <p>
          Novos processos, intimações e movimentações chegam ao AtJud
          automaticamente. A captura diária acompanha as OABs do escritório e
          mantém as novidades das fontes monitoradas no seu fluxo de trabalho.
        </p>
        <p>
          <strong>
            Histórico, teor, documentos e próximos passos no mesmo lugar.
          </strong>{" "}
          A informação que você precisa no dia a dia acompanha o trabalho, da
          primeira leitura à construção da peça.
        </p>
        <div className="lp-ingestion-points">
          <span>
            <Check size={16} aria-hidden="true" />
            Novos processos e intimações, todos os dias
          </span>
          <span>
            <Check size={16} aria-hidden="true" />
            Movimentações e autos no mesmo acervo
          </span>
          <span>
            <Check size={16} aria-hidden="true" />
            Sem pular de fonte em fonte para se atualizar
          </span>
        </div>
        <span className="lp-ingestion-note">
          Importação de autos conforme a conexão e a disponibilidade do
          tribunal.
        </span>
      </div>
      <div
        className="lp-acervo-visual"
        aria-label="Ilustração da centralização de publicações, histórico e autos no AtJud"
      >
        <div className="lp-acervo-sources">
          <span>
            <Radar size={17} aria-hidden="true" />
            DJEN<small>Publicações</small>
          </span>
          <span>
            <Layers3 size={17} aria-hidden="true" />
            DataJud<small>Histórico</small>
          </span>
          <span>
            <FileText size={17} aria-hidden="true" />
            Tribunais<small>Autos</small>
          </span>
        </div>
        <div className="lp-acervo-connector" aria-hidden="true">
          <span />
          <ArrowDown size={17} />
        </div>
        <div className="lp-acervo-folder">
          <div className="lp-acervo-heading">
            <span className="lp-acervo-icon">
              <FolderOpen size={24} aria-hidden="true" />
            </span>
            <div>
              <small>ACERVO CENTRALIZADO</small>
              <h3>Seu processo, com contexto.</h3>
            </div>
          </div>
          <div className="lp-acervo-row">
            <span>
              <FileText size={15} aria-hidden="true" />
              Publicação e teor da intimação
            </span>
            <Check size={14} aria-hidden="true" />
          </div>
          <div className="lp-acervo-row">
            <span>
              <Layers3 size={15} aria-hidden="true" />
              Histórico de movimentações
            </span>
            <Check size={14} aria-hidden="true" />
          </div>
          <div className="lp-acervo-row">
            <span>
              <FolderOpen size={15} aria-hidden="true" />
              Documentos e peças dos autos
            </span>
            <Check size={14} aria-hidden="true" />
          </div>
          <div className="lp-acervo-footer">
            O mesmo contexto alimenta a triagem, a minuta e o chat.
          </div>
        </div>
        <div className="lp-acervo-alert">
          <BellRing size={17} aria-hidden="true" />
          <span>
            <strong>As novidades ganham contexto.</strong>
            <small>
              Consulte o acervo e acompanhe os avisos de importação, prazos e
              atribuições.
            </small>
          </span>
        </div>
        <small className="lp-acervo-caption">
          Fluxo ilustrativo das fontes disponíveis.
        </small>
      </div>
    </section>
  );
}
