"use client";

import { ArrowRight, FileKey2 } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { usableCertificates } from "@/features/onboarding/lib/import-readiness";

import { useCertificados } from "../hooks/use-cert-upload";

/** A certificate is a prerequisite, never proof of an authenticated e-SAJ session. */
export function EsajAccess({ court }: { court: string }) {
  const certificates = useCertificados();
  const valid = usableCertificates(certificates.data ?? []);
  return (
    <Popover>
      <PopoverTrigger
        render={<Button size="sm" variant="outline" className="pointer-coarse:min-h-11" />}
      >
        Ver acesso
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 max-w-[calc(100vw-2rem)] gap-4 p-4"
      >
        <PopoverHeader>
          <PopoverTitle>{court} · e-SAJ</PopoverTitle>
          <PopoverDescription>
            O acesso é autenticado ao preparar o peticionamento de uma peça.
          </PopoverDescription>
        </PopoverHeader>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <FileKey2 className="text-muted-foreground size-4" aria-hidden />
            <p className="font-medium">Certificado A1</p>
          </div>
          {certificates.isPending ? (
            <p role="status" className="text-muted-foreground text-xs">
              Verificando certificados…
            </p>
          ) : certificates.isError ? (
            <div role="alert" className="flex flex-col gap-2">
              <p className="text-destructive text-xs">
                Não foi possível verificar os certificados.
              </p>
              <Button
                size="sm"
                variant="outline"
                disabled={certificates.isFetching}
                onClick={() => void certificates.refetch()}
                className="pointer-coarse:min-h-11"
              >
                Tentar novamente
              </Button>
            </div>
          ) : valid.length ? (
            <>
              <Badge variant="outline">
                {valid.length === 1
                  ? "Certificado disponível"
                  : `${valid.length} certificados disponíveis`}
              </Badge>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {valid.length === 1
                  ? `${valid[0].subject_cn.split(":")[0]}. `
                  : ""}
                Você poderá usar o certificado já cadastrado na preparação da
                peça.
              </p>
            </>
          ) : (
            <>
              <Badge variant="warning">Certificado pendente</Badge>
              <p className="text-muted-foreground text-xs">
                Cadastre um certificado válido para preparar o peticionamento.
              </p>
              <Button
                size="sm"
                variant="outline"
                nativeButton={false}
                render={<Link href="/configuracoes?tab=cert" />}
                className="pointer-coarse:min-h-11"
              >
                Adicionar certificado
              </Button>
            </>
          )}
        </div>
        <Separator />
        <p className="text-muted-foreground text-xs leading-relaxed">
          Abra a peça de um processo para iniciar. Se o e-SAJ solicitar 2FA,
          pediremos o código durante a operação. A conexão do eproc não libera
          este acesso.
        </p>
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={<Link href="/processos" />}
          className="pointer-coarse:min-h-11"
        >
          Abrir processos
          <ArrowRight data-icon="inline-end" />
        </Button>
      </PopoverContent>
    </Popover>
  );
}
