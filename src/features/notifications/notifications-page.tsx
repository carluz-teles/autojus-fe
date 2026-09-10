"use client";

import { useAuth } from "@clerk/nextjs";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  ArrowUpRight,
  Bell,
  Check,
  CheckCheck,
  ChevronRight,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ShellHeader } from "@/components/shell/page-frame";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import {
  notificationContent,
  notificationHref,
} from "./notification-presentation";
import type { NotificationView } from "./types";
import {
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotifications,
} from "./use-notifications";

export function NotificationsPage() {
  const { orgId, userId } = useAuth();
  // A selected message cannot survive a change of workspace or account.
  return <NotificationsWorkspace key={`${orgId}:${userId}`} />;
}

function NotificationsWorkspace() {
  const [tab, setTab] = useState("all");
  const [selected, setSelected] = useState<NotificationView | null>(null);
  const unread = useUnreadNotifications();
  const notifications = useNotifications(tab === "unread");
  const markRead = useMarkNotificationRead();
  const items = notifications.data?.pages.flatMap((page) => page.data) ?? [];
  // Keep the opened message visible when marking it read removes it from the
  // unread list. The server's latest row wins when it is still in the list.
  const current = selected
    ? (items.find((item) => item.id === selected.id) ?? selected)
    : null;

  const read = (notification: NotificationView) => {
    if (notification.read || markRead.isPending) return;
    markRead.mutate(notification.id, {
      onSuccess: () =>
        setSelected((previous) =>
          previous?.id === notification.id
            ? { ...previous, read: true }
            : previous,
        ),
    });
  };

  return (
    <div className="text-foreground flex min-h-0 min-w-0 flex-1 flex-col text-[13px]">
      <ShellHeader>
        <Bell
          aria-hidden
          className="text-fg2 size-4 shrink-0"
          strokeWidth={1.8}
        />
        <h1 className="text-[13px] font-medium">Notificações</h1>
        {unread.data ? (
          <span className="text-fg3 font-mono text-[11px]">
            {unread.data.count} não lidas
          </span>
        ) : null}
        <Tooltip
          label="Preferências de notificações"
          render={
            <Button
              className="ml-auto pointer-coarse:size-11"
              variant="ghost"
              size="icon-sm"
              nativeButton={false}
              render={<Link href="/configuracoes?tab=notificacoes" />}
              aria-label="Preferências de notificações"
            />
          }
        >
          <Settings2 aria-hidden />
        </Tooltip>
      </ShellHeader>
      <Tabs
        defaultValue="all"
        value={tab}
        onValueChange={(value) => {
          setTab(value);
          setSelected(null);
        }}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="border-line flex shrink-0 flex-wrap items-center justify-between gap-x-3 border-b px-4">
          <TabsList aria-label="Filtrar notificações">
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="unread">Não lidas</TabsTrigger>
          </TabsList>
          <Button
            variant="ghost"
            size="sm"
            disabled={!unread.data?.count || markRead.isPending}
            onClick={() =>
              markRead.mutate(null, {
                onSuccess: () =>
                  setSelected((previous) =>
                    previous ? { ...previous, read: true } : previous,
                  ),
              })
            }
          >
            <CheckCheck data-icon="inline-start" />
            Marcar todas como lidas
          </Button>
        </div>
        <TabsContent value={tab} className="flex min-h-0 flex-1">
          <section
            aria-label="Lista de notificações"
            className={cn(
              "surface-panel min-h-0 w-full shrink-0 overflow-y-auto rounded-none border-0 border-r pb-24 md:w-[380px] md:pb-0 xl:w-[440px]",
              current && "hidden md:block",
            )}
          >
            <div className="border-line2 text-fg3 flex h-10 items-center justify-between border-b px-4 text-[11px]">
              <span>
                {tab === "unread"
                  ? "Aguardando sua leitura"
                  : "Atividade do escritório"}
              </span>
              <span>Mais recentes primeiro</span>
            </div>
            {notifications.isPending ? (
              <div className="flex flex-col gap-4 p-4">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : notifications.isError ? (
              <div className="p-4">
                <Alert variant="destructive">
                  <AlertTitle>
                    Não foi possível carregar as notificações.
                  </AlertTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={notifications.isFetching}
                    onClick={() => void notifications.refetch()}
                  >
                    Tentar novamente
                  </Button>
                </Alert>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-8 py-16 text-center">
                <CheckCheck
                  className="text-fg3 mb-1 size-5"
                  strokeWidth={1.5}
                />
                <p className="font-medium">
                  {tab === "unread"
                    ? "Tudo em dia"
                    : "Nenhuma notificação por enquanto"}
                </p>
                <p className="text-fg3 max-w-64 text-[12px] leading-relaxed">
                  {tab === "unread"
                    ? "Você leu todas as suas notificações."
                    : "Novos processos, intimações e atualizações do escritório aparecerão aqui."}
                </p>
              </div>
            ) : (
              <ul className="divide-line2 divide-y">
                {items.map((notification) => (
                  <NotificationRow
                    key={notification.id}
                    notification={notification}
                    selected={current?.id === notification.id}
                    onSelect={() => {
                      setSelected(notification);
                      read(notification);
                    }}
                  />
                ))}
              </ul>
            )}
            {notifications.hasNextPage ? (
              <div className="flex justify-center p-4">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={notifications.isFetching}
                  onClick={() => void notifications.fetchNextPage()}
                >
                  {notifications.isFetchingNextPage
                    ? "Carregando…"
                    : "Carregar mais"}
                </Button>
              </div>
            ) : null}
          </section>
          <section
            id="notification-detail"
            aria-label="Detalhe da notificação"
            className={cn(
              "bg-background min-h-0 min-w-0 flex-1 flex-col",
              current ? "flex" : "hidden md:flex",
            )}
          >
            {current ? (
              <NotificationDetail
                notification={current}
                pending={markRead.isPending}
                onRead={() => read(current)}
                onBack={() => setSelected(null)}
              />
            ) : (
              <div className="text-fg3 flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                <Bell className="size-6" strokeWidth={1.3} />
                <p className="text-[13px]">
                  Selecione uma notificação para ver os detalhes.
                </p>
                <p className="max-w-72 text-[12px] leading-relaxed">
                  Acesse o processo, a intimação ou a providência a partir da
                  atualização.
                </p>
              </div>
            )}
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NotificationRow({
  notification,
  selected,
  onSelect,
}: {
  notification: NotificationView;
  selected: boolean;
  onSelect: () => void;
}) {
  const content = notificationContent(notification);
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-controls="notification-detail"
        className={cn(
          "focus-visible:ring-ring flex w-full items-start gap-3 border-l-2 px-4 py-3.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset",
          selected
            ? "border-primary bg-selected"
            : "hover:bg-hover border-transparent",
        )}
      >
        <span
          className="mt-1.5 flex size-3 shrink-0 items-center justify-center"
          aria-hidden
        >
          {notification.read ? (
            <Check className="text-fg3 size-3" />
          ) : (
            <span className="bg-primary size-1.5 rounded-full" />
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          {content.hasEntityTitle ? (
            <span className="text-fg3 truncate text-[10.5px]">
              {content.eventLabel}
            </span>
          ) : null}
          <span
            className={cn(
              "truncate leading-tight",
              notification.read ? "text-fg2" : "text-foreground font-medium",
            )}
          >
            {content.entityTitle}
          </span>
          {content.cnj ? (
            <span className="text-primary truncate font-mono text-[10.5px]">
              {content.cnj}
            </span>
          ) : null}
          <span className="text-fg3 line-clamp-1 text-[12px] leading-relaxed">
            {content.relatedTitle || content.description}
          </span>
          <span className="text-fg3 flex items-center gap-2 text-[10.5px]">
            <NotificationTime value={notification.created_at} />
            <span aria-hidden>·</span>
            <span>{notification.read ? "Lida" : "Não lida"}</span>
          </span>
        </span>
        <ChevronRight className="text-fg3 mt-1 size-3.5 shrink-0" aria-hidden />
      </button>
    </li>
  );
}

function NotificationDetail({
  notification,
  pending,
  onRead,
  onBack,
}: {
  notification: NotificationView;
  pending: boolean;
  onRead: () => void;
  onBack: () => void;
}) {
  const href = notificationHref(notification);
  const content = notificationContent(notification);
  return (
    <>
      <div className="border-line flex h-10 shrink-0 items-center gap-2 border-b px-3 md:hidden">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft data-icon="inline-start" />
          Voltar às notificações
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-6 pb-28 md:px-8 md:py-7">
        <div className="text-fg3 flex flex-wrap items-center gap-2 text-[11px]">
          <Bell className="size-3.5" aria-hidden />
          <span>
            {content.hasEntityTitle
              ? content.eventLabel
              : "Atualização do escritório"}
          </span>
          <span aria-hidden>·</span>
          <span>{notification.read ? "Lida" : "Não lida"}</span>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-[21px] leading-snug font-semibold tracking-tight">
            {content.entityTitle}
          </h2>
          {content.relatedTitle ? (
            <p className="text-fg2 text-[13px]">{content.relatedTitle}</p>
          ) : null}
          {content.cnj ? (
            <span className="text-primary font-mono text-[12px]">
              {content.cnj}
            </span>
          ) : null}
          <NotificationTime value={notification.created_at} full />
        </div>
        <p className="border-line max-w-3xl border-t pt-5 text-[13px] leading-7 break-words whitespace-pre-line">
          {content.description}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {href ? (
            <Button
              size="sm"
              nativeButton={false}
              render={<Link href={href} />}
              onClick={() => {
                if (!notification.read && !pending) onRead();
              }}
            >
              {notificationDestinationLabel(href)}
              <ArrowUpRight data-icon="inline-end" />
            </Button>
          ) : null}
          {!notification.read ? (
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={onRead}
            >
              <Check data-icon="inline-start" />
              Marcar como lida
            </Button>
          ) : null}
        </div>
      </div>
    </>
  );
}

function NotificationTime({
  value,
  full = false,
}: {
  value: string;
  full?: boolean;
}) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return (
    <time
      dateTime={value}
      title={date.toLocaleString("pt-BR")}
      className={full ? "text-fg3 text-[12px]" : undefined}
    >
      {full
        ? date.toLocaleString("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : formatDistanceToNow(date, { locale: ptBR, addSuffix: true })}
    </time>
  );
}

function notificationDestinationLabel(href: string) {
  if (href === "/primeira-importacao") return "Ver importação";
  if (href.startsWith("/processos/")) return "Abrir processo";
  if (href.startsWith("/intimacoes/")) return "Abrir intimação";
  if (href.startsWith("/providencias/")) return "Abrir providência";
  if (href.startsWith("/pecas/")) return "Abrir peça";
  return "Abrir atualização";
}
