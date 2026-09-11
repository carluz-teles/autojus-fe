"use client";

import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronRight,
  CircleCheck,
  Clock3,
  FileText,
  FolderOpen,
  ListChecks,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import { demoCalendar, demoNotifications } from "../content";
import { useProductDemo } from "../hooks/use-product-demo";
import { LandingBrand } from "./landing-brand";

function TriagePreview() {
  const demo = useProductDemo();
  return (
    <div className="lp-triage-layout">
      <div className="lp-triage-list">
        <div className="lp-preview-heading">
          <div>
            <span className="lp-micro">TRIAGEM AUTOMÁTICA</span>
            <h3>O AtJud já fez a primeira leitura.</h3>
          </div>
          <span className="lp-counter">3</span>
        </div>
        <p className="lp-preview-help">
          Atuação, ciência ou cumprimento? Explore a classificação.
        </p>
        {demoNotifications.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn(
              "lp-work-item",
              demo.selected.id === item.id && "is-selected",
            )}
            aria-pressed={demo.selected.id === item.id}
            data-notification={item.id}
            onClick={demo.select}
          >
            <span className="lp-work-icon">
              <FileText size={17} aria-hidden="true" />
            </span>
            <span className="lp-work-copy">
              <strong>{item.title}</strong>
              <span>{item.process}</span>
              <span className="lp-work-meta">
                <Clock3 size={12} aria-hidden="true" />
                {item.time}
                <span className="lp-avatar">{item.initials}</span>
              </span>
            </span>
            <ChevronRight size={15} aria-hidden="true" />
          </button>
        ))}
        <div className="lp-list-note">
          <CheckCheck size={15} aria-hidden="true" />
          Providências geradas a partir do teor e do contexto.
        </div>
      </div>
      <div className="lp-work-detail" aria-live="polite">
        <div className="lp-detail-top">
          <span className="lp-micro">{demo.selected.tag}</span>
          <Badge variant={demo.selected.badgeVariant}>
            {demo.selected.status}
          </Badge>
        </div>
        <h4>{demo.selected.title}</h4>
        <p>{demo.selected.description}</p>
        <div className="lp-detail-person">
          <span className="lp-avatar">{demo.selected.initials}</span>
          <span>
            <small>Responsável</small>
            {demo.selected.person}
          </span>
          <Users size={16} aria-hidden="true" />
        </div>
        <details className="lp-source-disclosure" key={demo.selected.id}>
          <summary>
            <FileText size={15} aria-hidden="true" />
            Ver a fonte da classificação
            <ArrowUpRight size={15} aria-hidden="true" />
          </summary>
          <div>
            <span>
              {demo.selected.document} · página {demo.selected.page}
            </span>
            <blockquote>“{demo.selected.quote}”</blockquote>
            <small>Trecho fictício para demonstração.</small>
          </div>
        </details>
      </div>
    </div>
  );
}

function DeadlinePreview() {
  return (
    <div className="lp-deadline-preview">
      <div className="lp-calendar-sheet">
        <div className="lp-preview-heading">
          <div>
            <span className="lp-micro">VISÃO DO ESCRITÓRIO</span>
            <h3>Setembro, com clareza.</h3>
          </div>
          <CalendarDays size={23} aria-hidden="true" />
        </div>
        <div
          className="lp-calendar-grid"
          aria-label="Calendário ilustrativo de setembro de 2026"
        >
          {["D", "S", "T", "Q", "Q", "S", "S"].map((day, index) => (
            <span
              className="lp-calendar-weekday"
              key={index}
              aria-hidden="true"
            >
              {day}
            </span>
          ))}
          {demoCalendar.map((day) => (
            <span
              key={day.id}
              className={cn(
                "lp-calendar-day",
                day.current && "is-today",
                day.hasDeadline && "has-deadline",
                day.weekend && "is-weekend",
              )}
              aria-label={day.description}
            >
              {day.label}
            </span>
          ))}
        </div>
        <div className="lp-calendar-legend">
          <span>
            <i />
            Entregas da equipe
          </span>
          <span>Exemplo ilustrativo</span>
        </div>
      </div>
      <div className="lp-calculation">
        <Badge variant="success">
          <ShieldCheck aria-hidden="true" />
          Memória de cálculo
        </Badge>
        <h4>
          Você vê a data.
          <br />E entende o caminho.
        </h4>
        <ul>
          <li>
            <Check size={16} aria-hidden="true" />
            Regime de contagem identificado
          </li>
          <li>
            <Check size={16} aria-hidden="true" />
            Dias úteis e recesso considerados
          </li>
          <li>
            <Check size={16} aria-hidden="true" />
            Feriados da base registrados
          </li>
          <li>
            <Check size={16} aria-hidden="true" />
            Divergências sinalizadas para revisão
          </li>
        </ul>
        <div className="lp-calculation-note">
          <Clock3 size={18} aria-hidden="true" />
          <span>Prazo interno e prazo processual no mesmo contexto.</span>
        </div>
      </div>
    </div>
  );
}

function DraftPreview() {
  return (
    <div className="lp-draft-preview">
      <div className="lp-editor-sheet">
        <div className="lp-editor-toolbar">
          <span>
            <FileText size={15} aria-hidden="true" />
            Manifestação
          </span>
          <Badge variant="secondary">Rascunho ilustrativo</Badge>
        </div>
        <div className="lp-editor-paper">
          <span className="lp-paper-eyebrow">EM CONSTRUÇÃO · VERSÃO 01</span>
          <h3>
            Manifestação sobre
            <br />
            os documentos juntados
          </h3>
          <h4>I. Do contexto</h4>
          <p>
            Em atenção à intimação, a parte autora apresenta sua manifestação
            sobre os documentos juntados aos autos.
          </p>
          <p>
            <mark>
              A documentação apresentada descreve os serviços contratados e as
              condições de sua execução.
            </mark>
          </p>
          <h4>II. Dos pontos a esclarecer</h4>
          <p>
            Os elementos disponíveis devem ser analisados em conjunto com os
            demais documentos do processo.
          </p>
          <span className="lp-editor-caret" aria-hidden="true" />
        </div>
      </div>
      <div className="lp-assistant-preview">
        <span className="lp-assistant-label">
          <Sparkles size={17} aria-hidden="true" />
          Assistente AtJud
        </span>
        <h4>
          A fonte faz parte
          <br />
          da resposta.
        </h4>
        <p>Abra uma referência para conferir o trecho usado na construção.</p>
        <details className="lp-source-disclosure">
          <summary>
            <FileText size={15} aria-hidden="true" />
            Contrato · página 4<ArrowUpRight size={15} aria-hidden="true" />
          </summary>
          <div>
            <blockquote>
              “O presente contrato tem por objeto a prestação dos serviços
              descritos no anexo.”
            </blockquote>
            <small>Documento fictício para demonstração.</small>
          </div>
        </details>
        <div className="lp-unverified">
          <span>
            <Search size={15} aria-hidden="true" />
            Pendente de verificação
          </span>
          <p>
            A comprovação de entrega precisa ser conferida nos documentos do
            processo.
          </p>
        </div>
        <div className="lp-human-check">
          <CircleCheck size={16} aria-hidden="true" />
          Sua revisão fecha a versão.
        </div>
      </div>
    </div>
  );
}

export function ProductDemo() {
  return (
    <div className="lp-product-demo">
      <div className="lp-demo-chrome">
        <span className="lp-window-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span>Seu escritório, conectado.</span>
        <span className="lp-demo-label">DEMONSTRAÇÃO INTERATIVA</span>
      </div>
      <div className="lp-demo-shell">
        <aside
          className="lp-demo-sidebar"
          aria-label="Contexto da demonstração"
        >
          <LandingBrand />
          <span className="lp-sidebar-section">ESPAÇO DO ESCRITÓRIO</span>
          <span className="lp-sidebar-item">
            <Bell size={16} aria-hidden="true" />
            Notificações<span>3</span>
          </span>
          <span className="lp-sidebar-item is-active">
            <ListChecks size={16} aria-hidden="true" />
            Seu trabalho
          </span>
          <span className="lp-sidebar-item">
            <FolderOpen size={16} aria-hidden="true" />
            Acervo de processos
          </span>
          <div className="lp-sidebar-bottom">
            <span className="lp-avatar">SE</span>
            <span>
              Seu escritório<small>Uma equipe. Um contexto.</small>
            </span>
          </div>
        </aside>
        <div className="lp-demo-main">
          <Tabs defaultValue="triagem">
            <div className="lp-demo-tabs">
              <TabsList aria-label="Explorar a plataforma">
                <TabsTrigger value="triagem">
                  <ListChecks size={15} aria-hidden="true" />
                  Triagem
                </TabsTrigger>
                <TabsTrigger value="prazos">
                  <CalendarDays size={15} aria-hidden="true" />
                  Prazos
                </TabsTrigger>
                <TabsTrigger value="pecas">
                  <Sparkles size={15} aria-hidden="true" />
                  Construção de peças
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="triagem" keepMounted>
              <TriagePreview />
            </TabsContent>
            <TabsContent value="prazos" keepMounted>
              <DeadlinePreview />
            </TabsContent>
            <TabsContent value="pecas" keepMounted>
              <DraftPreview />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <div className="lp-demo-footnote">
        <span>
          <span className="lp-status-dot" />
          Explore as abas e as fontes
        </span>
        <span>Dados fictícios · nenhuma ação em processos reais</span>
      </div>
    </div>
  );
}
