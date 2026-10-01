"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { useBackofficeContext } from "../hooks/use-backoffice-context";
import { capabilityLabel } from "../services/capabilities";

export function BackofficeHome() {
  const session = useBackofficeContext();
  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-muted-foreground text-sm">Bancada interna</p>
        <h1 className="font-display text-3xl">Curadoria jurídica</h1>
        <p className="text-muted-foreground leading-relaxed">
          Revisão humana de intimações e argumentos, com evidências e histórico
          de cada decisão.
        </p>
      </div>
      {session.capabilities.includes("curation.read") ? (
        <Link
          href="/backoffice/feedback"
          className={buttonVariants({
            variant: "outline",
            className: "self-start",
          })}
        >
          Consultar feedback das ações de IA
        </Link>
      ) : null}
      {session.capabilities.includes("curation.admit") ? (
        <Link
          href="/backoffice/feedback-queues"
          className={buttonVariants({
            variant: "outline",
            className: "self-start",
          })}
        >
          Selecionar casos a partir do feedback
        </Link>
      ) : null}
      {session.capabilities.includes("curation.admit") ? (
        <Link
          href="/backoffice/imports"
          className={buttonVariants({ className: "self-start" })}
        >
          Importar e revisar lotes
        </Link>
      ) : null}
      {session.capabilities.includes("curation.manage") ? (
        <Link
          href="/backoffice/sampling"
          className={buttonVariants({
            variant: "outline",
            className: "self-start",
          })}
        >
          Preparar e consultar amostras
        </Link>
      ) : null}
      {session.capabilities.includes("curation.annotate") ? (
        <Link
          href="/backoffice/curation"
          className={buttonVariants({
            variant: "outline",
            className: "self-start",
          })}
        >
          Revisar intimações e retomar meu trabalho
        </Link>
      ) : null}
      {session.capabilities.includes("curation.manage") ? (
        <Link
          href="/backoffice/preparation"
          className={buttonVariants({
            variant: "outline",
            className: "self-start",
          })}
        >
          Preparar protocolos e lotes de revisão
        </Link>
      ) : null}
      {session.capabilities.includes("curation.decide") ? (
        <Link
          href="/backoffice/decisions"
          className={buttonVariants({
            variant: "outline",
            className: "self-start",
          })}
        >
          Comparar respostas e decidir revisões
        </Link>
      ) : null}
      {session.capabilities.includes("curation.publish") ? (
        <Link
          href="/backoffice/gold"
          className={buttonVariants({
            variant: "outline",
            className: "self-start",
          })}
        >
          Conferir e publicar gold
        </Link>
      ) : null}
      {session.capabilities.includes("curation.publish") ? (
        <Link
          href="/backoffice/releases"
          className={buttonVariants({
            variant: "outline",
            className: "self-start",
          })}
        >
          Preparar e publicar datasets
        </Link>
      ) : null}
      {session.capabilities.includes("curation.publish") ? (
        <Link
          href="/backoffice/withdrawals"
          className={buttonVariants({
            variant: "outline",
            className: "self-start",
          })}
        >
          Consultar retirada de origens e políticas
        </Link>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Seu acesso está habilitado</CardTitle>
          <CardDescription>
            Permissões de trabalho atribuídas à sua conta interna.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {session.capabilities.map((capability) => (
            <Badge key={capability} variant="outline">
              {capabilityLabel(capability)}
            </Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
