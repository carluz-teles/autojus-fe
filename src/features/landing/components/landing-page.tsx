import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BellRing,
  Check,
  FileCheck2,
  FileSearch,
  Fingerprint,
  Layers3,
  LockKeyhole,
  MessageSquareText,
  Plus,
  Radar,
  Route,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

import { faqs, workflow } from "../content";
import { ChatShowcase } from "./chat-showcase";
import { FilingOverview } from "./filing-overview";
import { HeroVisual } from "./hero-visual";
import { IngestionOverview } from "./ingestion-overview";
import { LandingBrand } from "./landing-brand";
import { LandingHeader } from "./landing-header";
import { ProductDemo } from "./product-demo";

export function LandingPage() {
  return (
    <div className="lp" id="inicio">
      <a className="lp-skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <LandingHeader />
      <main id="conteudo">
        <section
          className="lp-hero lp-container"
          aria-labelledby="lp-hero-title"
        >
          <div className="lp-hero-copy">
            <span className="lp-eyebrow">
              <span className="lp-status-dot" />
              SEU ACERVO. SUA TRIAGEM. SUA INTELIGÊNCIA JURÍDICA.
            </span>
            <h1 id="lp-hero-title">
              A intimação chega.
              <br />
              O próximo passo,
              <br />
              <em>também.</em>
              <span className="lp-title-star" aria-hidden="true">
                ✳
              </span>
            </h1>
            <p>
              Processos, publicações e autos em um só lugar. O AtJud gera
              providências automaticamente, prepara minutas com fundamento e
              responde às suas perguntas com <strong>contexto e fontes.</strong>
            </p>
            <div className="lp-hero-actions">
              <Link
                href="/sign-up"
                prefetch={false}
                className={buttonVariants({ size: "lg" })}
              >
                Começar com o AtJud
                <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
              </Link>
              <a href="#plataforma" className="lp-text-link">
                Conhecer por dentro
                <ArrowDown size={15} aria-hidden="true" />
              </a>
            </div>
            <div className="lp-hero-note">
              <ShieldCheck size={15} aria-hidden="true" />
              Inteligência artificial. Critério humano.
            </div>
          </div>
          <HeroVisual />
        </section>

        <section
          className="lp-sources lp-container"
          aria-label="Fontes e conexões do produto"
        >
          <div>
            <span className="lp-micro">CONECTADO À SUA REALIDADE</span>
            <p>
              O contexto certo.
              <br />
              Desde a fonte.
            </p>
          </div>
          <div className="lp-source-name">
            <span>
              DJEN<span className="lp-source-dot">.</span>
            </span>
            <small>Publicações por OAB</small>
          </div>
          <div className="lp-source-name">
            <span>DataJud</span>
            <small>Dados processuais</small>
          </div>
          <div className="lp-source-name">
            <span className="lp-eproc">eproc</span>
            <small>Importação de autos*</small>
          </div>
          <div className="lp-source-name">
            <span>e-SAJ</span>
            <small>Preparação de rascunhos*</small>
          </div>
          <p className="lp-source-footnote">
            * Conforme os tribunais e as conexões disponíveis.
          </p>
        </section>

        <IngestionOverview />

        <section
          className="lp-platform lp-section"
          id="plataforma"
          aria-labelledby="lp-platform-title"
        >
          <div className="lp-container">
            <div className="lp-section-heading">
              <div>
                <span className="lp-eyebrow">
                  <span className="lp-section-index">02 /</span> PROVIDÊNCIAS
                  AUTOMÁTICAS
                </span>
                <h2 id="lp-platform-title">
                  É ciência? Exige atuação?
                  <br />
                  <em>O AtJud faz a triagem.</em>
                </h2>
              </div>
              <p>
                Receba as providências sem começar pela leitura manual de todos
                os autos. O AtJud analisa a intimação e o contexto disponível,
                identifica o que exige trabalho e reconhece respostas já
                apresentadas no histórico.
              </p>
            </div>
            <ProductDemo />
            <div className="lp-value-row">
              <span>
                <Radar size={18} aria-hidden="true" />
                Providências geradas automaticamente
              </span>
              <span>
                <Route size={18} aria-hidden="true" />
                Mera ciência identificada
              </span>
              <span>
                <FileCheck2 size={18} aria-hidden="true" />
                Cumprimento reconhecido no histórico
              </span>
            </div>
          </div>
        </section>

        <section
          className="lp-workflow lp-section lp-container"
          id="como-funciona"
          aria-labelledby="lp-workflow-title"
        >
          <div className="lp-section-heading">
            <div>
              <span className="lp-eyebrow">
                <span className="lp-section-index">03 /</span> UM FLUXO QUE FAZ
                SENTIDO
              </span>
              <h2 id="lp-workflow-title">
                Do “o que aconteceu?”
                <br />
                ao <em>“próximo passo”.</em>
              </h2>
            </div>
            <p>
              O trabalho jurídico tem continuidade.
              <br />
              Sua plataforma também precisa ter.
            </p>
          </div>
          <div className="lp-workflow-grid">
            {workflow.map((step) => (
              <article key={step.number} className="lp-workflow-step">
                <div className="lp-step-top">
                  <span>{step.number}</span>
                  <ArrowRight size={18} strokeWidth={1} aria-hidden="true" />
                </div>
                <span className="lp-step-label">{step.label}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
                <span className="lp-step-detail">{step.detail}</span>
              </article>
            ))}
          </div>
        </section>

        <section
          className="lp-intelligence"
          id="inteligencia"
          aria-labelledby="lp-intelligence-title"
        >
          <div className="lp-container lp-intelligence-grid">
            <div className="lp-intelligence-copy">
              <span className="lp-eyebrow">
                <span className="lp-section-index">04 /</span> GERAÇÃO
                INTELIGENTE DE MINUTAS
              </span>
              <h2 id="lp-intelligence-title">
                Da intimação
                <br />
                à minuta.
                <br />
                <em>Com fundamento.</em>
              </h2>
              <p>
                Comece com uma peça estruturada para o seu caso. O AtJud cruza o
                teor da intimação com os documentos disponíveis, organiza a
                redação conforme o tipo de peça e usa as teses selecionadas para
                construir os argumentos.
              </p>
              <div className="lp-trust-item">
                <span>
                  <FileSearch size={20} aria-hidden="true" />
                </span>
                <div>
                  <h3>Teses concretas. Argumentos pertinentes.</h3>
                  <p>
                    As sugestões partem do objetivo da intimação e dos elementos
                    disponíveis. Confira a fonte, a página e o trecho que
                    sustentam a análise.
                  </p>
                </div>
              </div>
              <div className="lp-trust-item">
                <span>
                  <Fingerprint size={20} aria-hidden="true" />
                </span>
                <div>
                  <h3>Estrutura jurídica, pronta para refinar.</h3>
                  <p>
                    Fatos, fundamentos e pedidos organizados conforme o perfil
                    da peça. Ajuste o tom e revise os pontos que precisam da sua
                    decisão.
                  </p>
                </div>
              </div>
              <a href="#plataforma" className="lp-text-link">
                Veja a minuta em construção
                <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            </div>
            <div className="lp-evidence-scene">
              <div className="lp-evidence-back" aria-hidden="true">
                <span>AUTOS DO PROCESSO</span>
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="lp-evidence-paper">
                <div className="lp-evidence-paper-top">
                  <FileSearch size={18} aria-hidden="true" />
                  <span>ANÁLISE COM CONTEXTO</span>
                  <span>01</span>
                </div>
                <h3>
                  O fundamento
                  <br />
                  está nos autos.
                </h3>
                <p>
                  O documento descreve o objeto e as condições da contratação.
                </p>
                <div className="lp-evidence-quote">
                  <span>
                    <Check size={13} aria-hidden="true" />
                    FONTE IDENTIFICADA
                  </span>
                  <blockquote>
                    “O presente contrato tem por objeto a prestação dos serviços
                    descritos no anexo.”
                  </blockquote>
                  <span>
                    Contrato de prestação de serviços · pág. 4
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </span>
                </div>
                <div className="lp-evidence-warning">
                  <span>
                    <SearchMark />
                    NÃO VERIFICADO
                  </span>
                  <p>
                    Comprovação de entrega não identificada nos documentos
                    disponíveis.
                  </p>
                </div>
                <div className="lp-paper-footer">
                  <span>Material ilustrativo</span>
                  <span>Revisão humana necessária</span>
                </div>
              </div>
              <div className="lp-evidence-sticker">
                <ShieldCheck size={18} aria-hidden="true" />
                <span>
                  Transparência faz
                  <br />
                  <strong>parte da resposta.</strong>
                </span>
              </div>
            </div>
          </div>
        </section>

        <section
          className="lp-assistance lp-section lp-container"
          id="assistente"
          aria-labelledby="lp-assistance-title"
        >
          <div className="lp-assistance-copy">
            <span className="lp-eyebrow">
              <span className="lp-section-index">05 /</span> CHAT JURÍDICO COM
              CONTEXTO
            </span>
            <h2 id="lp-assistance-title">
              Pergunte ao processo.
              <br />
              <em>Avance na resposta.</em>
            </h2>
            <p>
              Resumir um auto? Entender o processo? Deixar a minuta mais
              enfática? Converse com o assistente enquanto trabalha. O contexto
              já está ali.
            </p>
            <div className="lp-assistance-benefits">
              <article>
                <FileSearch size={20} aria-hidden="true" />
                <div>
                  <h3>Da pilha de documentos ao essencial.</h3>
                  <p>
                    Peça resumos dos autos e do processo. Entenda o teor da
                    intimação e encontre os pontos que merecem atenção.
                  </p>
                </div>
              </article>
              <article>
                <Fingerprint size={20} aria-hidden="true" />
                <div>
                  <h3>Mais enfático. Mais objetivo. Mais seu.</h3>
                  <p>
                    Ajuste o tom, fortaleça a clareza dos argumentos e receba
                    propostas concretas para melhorar a minuta.
                  </p>
                </div>
              </article>
              <article>
                <MessageSquareText size={20} aria-hidden="true" />
                <div>
                  <h3>Converse, confira a fonte e decida.</h3>
                  <p>
                    As respostas apoiadas nos autos vêm com referências. O
                    assistente aponta lacunas e propõe alterações para você
                    aprovar.
                  </p>
                </div>
              </article>
            </div>
          </div>
          <ChatShowcase />
        </section>

        <FilingOverview />

        <section
          className="lp-control lp-section lp-container"
          aria-labelledby="lp-control-title"
        >
          <div className="lp-control-intro">
            <span className="lp-eyebrow">
              <span className="lp-section-index">07 /</span> TECNOLOGIA QUE
              RESPEITA SEU TRABALHO
            </span>
            <h2 id="lp-control-title">
              Mais fôlego na rotina.
              <br />
              <em>Mais controle nas decisões.</em>
            </h2>
          </div>
          <div className="lp-control-grid">
            <article>
              <BellRing size={25} strokeWidth={1.4} aria-hidden="true" />
              <h3>O prazo tem uma explicação.</h3>
              <p>
                Dias úteis, recesso e feriados da base utilizada entram no
                cálculo. A memória fica disponível; divergências pedem sua
                conferência.
              </p>
              <span>CLAREZA PARA PRIORIZAR</span>
            </article>
            <article>
              <Layers3 size={25} strokeWidth={1.4} aria-hidden="true" />
              <h3>O trabalho tem continuidade.</h3>
              <p>
                Distribua providências, defina responsáveis e acompanhe o
                andamento. A equipe compartilha o contexto para fazer a próxima
                entrega.
              </p>
              <span>VISIBILIDADE PARA A EQUIPE</span>
            </article>
            <article>
              <LockKeyhole size={25} strokeWidth={1.4} aria-hidden="true" />
              <h3>O escritório tem seu espaço.</h3>
              <p>
                Dados separados por escritório e conexões autenticadas quando
                necessárias. A decisão de revisar e avançar continua com o
                advogado.
              </p>
              <span>AUTONOMIA COM RESPONSABILIDADE</span>
            </article>
          </div>
        </section>

        <section
          className="lp-evolution lp-container"
          aria-label="Evolução da plataforma"
        >
          <span className="lp-evolution-icon">
            <Sparkles size={23} strokeWidth={1.3} aria-hidden="true" />
          </span>
          <div>
            <span className="lp-micro">UM PRODUTO EM EVOLUÇÃO</span>
            <h3>Uma operação cada vez mais conectada.</h3>
            <p>
              A personalização pela voz do escritório e o aprendizado com o
              resultado das petições são os próximos capítulos dessa jornada.
            </p>
          </div>
          <span className="lp-evolution-tag">
            No horizonte
            <ArrowUpRight size={14} aria-hidden="true" />
          </span>
        </section>

        <section
          className="lp-faq lp-section lp-container"
          id="duvidas"
          aria-labelledby="lp-faq-title"
        >
          <div>
            <span className="lp-eyebrow">ANTES DO PRIMEIRO PASSO</span>
            <h2 id="lp-faq-title">
              Vamos deixar
              <br />
              <em>tudo claro.</em>
            </h2>
            <p>
              Sobre o produto, os limites
              <br />e o que fica nas suas mãos.
            </p>
          </div>
          <div className="lp-faq-list">
            {faqs.map((faq, index) => (
              <details key={faq.question} className="lp-faq-item">
                <summary>
                  <span className="lp-faq-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{faq.question}</span>
                  <Plus size={18} strokeWidth={1.5} aria-hidden="true" />
                </summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="lp-final-cta" aria-labelledby="lp-cta-title">
          <div className="lp-container">
            <span className="lp-eyebrow">
              <span className="lp-status-dot" />
              SEU PRÓXIMO PASSO COMEÇA AQUI
            </span>
            <h2 id="lp-cta-title">
              O trabalho muda.
              <br />
              <em>A advocacia continua sua.</em>
            </h2>
            <p>
              Centralize o acervo. Receba as providências. Construa a peça.
              <br />
              Seu próximo passo já tem contexto.
            </p>
            <Link
              href="/sign-up"
              prefetch={false}
              className={buttonVariants({ variant: "secondary", size: "lg" })}
            >
              Começar com o AtJud
              <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
            </Link>
            <div className="lp-cta-orbit" aria-hidden="true" />
            <span className="lp-cta-star" aria-hidden="true">
              ✳
            </span>
          </div>
        </section>
      </main>
      <footer className="lp-footer lp-container">
        <div className="lp-footer-top">
          <a href="#inicio" aria-label="AtJud — voltar ao início">
            <LandingBrand />
          </a>
          <p>
            Inteligência para o processo.
            <br />
            Tempo para a advocacia.
          </p>
          <nav aria-label="Navegação do rodapé">
            <a href="#plataforma">A plataforma</a>
            <a href="#duvidas">Dúvidas frequentes</a>
            <Link href="/sign-in" prefetch={false}>
              Acessar minha conta
              <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          </nav>
        </div>
        <div className="lp-footer-bottom">
          <span>
            © {new Date().getFullYear()} AtJud. Todos os direitos reservados.
          </span>
          <span>
            Feito para a advocacia brasileira.
            <span className="lp-brazil-dot" aria-hidden="true" />
          </span>
        </div>
      </footer>
    </div>
  );
}

function SearchMark() {
  return (
    <span className="lp-unverified-mark" aria-hidden="true">
      ?
    </span>
  );
}
