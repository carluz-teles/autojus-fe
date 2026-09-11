import {
  ArrowDown,
  ArrowUpRight,
  Check,
  FileText,
  Radar,
  Sparkles,
} from "lucide-react";

export function HeroVisual() {
  return (
    <div
      className="lp-hero-visual"
      aria-label="Ilustração do fluxo: publicação analisada, providência gerada automaticamente e minuta fundamentada"
    >
      <div className="lp-visual-grid" aria-hidden="true" />
      <div className="lp-orbit lp-orbit-one" aria-hidden="true" />
      <div className="lp-orbit lp-orbit-two" aria-hidden="true" />
      <div className="lp-visual-caption">
        <span className="lp-status-dot" />
        DA INTIMAÇÃO À PROVIDÊNCIA<span>ATJUD / 01</span>
      </div>
      <div className="lp-visual-flow">
        <div className="lp-capture-card">
          <span className="lp-capture-icon">
            <Radar size={21} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <div>
            <small>PUBLICAÇÃO IDENTIFICADA</small>
            <strong>
              O teor foi analisado.
              <br />A ação, identificada.
            </strong>
            <span>DJEN · acompanhamento por OAB</span>
          </div>
          <span className="lp-capture-check">
            <Check size={13} aria-hidden="true" />
          </span>
        </div>
        <div className="lp-flow-connector" aria-hidden="true">
          <span />
          <ArrowDown size={13} />
        </div>
        <div className="lp-deadline-card">
          <div>
            <span className="lp-mini-label">
              PROVIDÊNCIA GERADA AUTOMATICAMENTE
            </span>
            <strong>Manifestar sobre documentos</strong>
            <span className="lp-mini-meta">
              <i />
              Manifestação necessária<span>AM</span>
            </span>
          </div>
          <span className="lp-deadline-symbol" aria-hidden="true">
            ↗
          </span>
        </div>
        <div className="lp-flow-connector" aria-hidden="true">
          <span />
          <ArrowDown size={13} />
        </div>
        <div className="lp-draft-card">
          <div className="lp-draft-card-heading">
            <span>
              <Sparkles size={15} aria-hidden="true" />O contexto vira
              construção.
            </span>
            <span className="lp-draft-badge">IA + VOCÊ</span>
          </div>
          <div className="lp-draft-card-body">
            <FileText size={25} strokeWidth={1.2} aria-hidden="true" />
            <div>
              <strong>Minuta com teses e contexto</strong>
              <span>Estrutura, argumentos e fontes para revisar.</span>
            </div>
          </div>
          <div className="lp-draft-card-bottom">
            <span>
              <span className="lp-citation-dot">1</span>Despacho · pág. 3
            </span>
            <Check size={14} aria-hidden="true" />
          </div>
        </div>
      </div>
      <div className="lp-visual-bottom">
        <span>
          O trabalho avança.
          <br />
          <strong>Você mantém a direção.</strong>
        </span>
        <ArrowUpRight size={27} strokeWidth={1} aria-hidden="true" />
      </div>
    </div>
  );
}
