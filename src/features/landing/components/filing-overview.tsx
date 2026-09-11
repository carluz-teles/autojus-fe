import {
  ArrowDown,
  ArrowUpRight,
  Check,
  FileText,
  Landmark,
  Paperclip,
  ShieldCheck,
} from "lucide-react";

export function FilingOverview() {
  return (
    <section
      className="lp-filing lp-section"
      id="protocolo"
      aria-labelledby="lp-filing-title"
    >
      <div className="lp-container lp-filing-grid">
        <div className="lp-filing-copy">
          <span className="lp-eyebrow">
            <span className="lp-section-index">06 /</span> CONEXÃO COM O
            TRIBUNAL
          </span>
          <h2 id="lp-filing-title">
            Da peça pronta
            <br />
            ao tribunal.
            <br />
            <em>Menos etapas manuais.</em>
          </h2>
          <p>
            Petição, anexos e dados do processo organizados para avançar juntos.
            O AtJud já prepara o rascunho no e-SAJ/TJSP e reduz o trabalho de
            transferir as informações para o portal.
          </p>
          <div className="lp-filing-next">
            <span>PROTOCOLAÇÃO AUTOMÁTICA · EM IMPLANTAÇÃO</span>
            <p>
              O próximo passo é enviar o conjunto ao tribunal de origem após a
              aprovação do advogado e guardar o comprovante no processo. As
              integrações avançam conforme a cobertura de cada tribunal.
            </p>
          </div>
          <a href="#duvidas" className="lp-text-link">
            Entenda a disponibilidade do protocolo
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
        <div className="lp-filing-visual">
          <div className="lp-filing-package">
            <span className="lp-micro">PRONTO PARA CONFERÊNCIA</span>
            <h3>
              Um processo.
              <br />
              Tudo no mesmo envio.
            </h3>
            <div>
              <FileText size={18} aria-hidden="true" />
              <span>
                Petição principal<small>Versão preparada para revisão</small>
              </span>
              <Check size={15} aria-hidden="true" />
            </div>
            <div>
              <Paperclip size={18} aria-hidden="true" />
              <span>
                Anexos da petição<small>Documentos vinculados à peça</small>
              </span>
              <Check size={15} aria-hidden="true" />
            </div>
            <div>
              <Landmark size={18} aria-hidden="true" />
              <span>
                Dados do processo
                <small>Destino e informações do peticionamento</small>
              </span>
              <Check size={15} aria-hidden="true" />
            </div>
          </div>
          <div className="lp-filing-connection">
            <ArrowDown size={20} aria-hidden="true" />
            <span>PREPARAÇÃO AUTOMÁTICA</span>
          </div>
          <div className="lp-filing-destination">
            <Landmark size={25} aria-hidden="true" />
            <div>
              <strong>Rascunho no e-SAJ / TJSP</strong>
              <span>Aguardando conferência, assinatura e envio</span>
            </div>
            <ShieldCheck size={21} aria-hidden="true" />
          </div>
          <small className="lp-acervo-caption">
            Fluxo ilustrativo. O protocolo definitivo ainda não está habilitado.
          </small>
        </div>
      </div>
    </section>
  );
}
