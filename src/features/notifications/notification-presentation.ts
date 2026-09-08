import { formatarCNJ } from "@/features/prazos/lib/detalhe-apresentacao";

import type {
  NotificationPreference,
  NotificationTypeDefinition,
  NotificationView,
} from "./types";

const ALLOWED_DESTINATION =
  /^\/(?:processos|intimacoes|providencias|pecas)\/[a-zA-Z0-9-]+(?:[?#][^\\\s]*)?$/;

/** Destinations are app routes, never an external URL supplied in an event. */
export function notificationHref(
  notification: Pick<NotificationView, "payload">,
): string | null {
  const href = notification.payload?.href;
  if (href === "/primeira-importacao") return href;
  if (typeof href === "string" && ALLOWED_DESTINATION.test(href)) return href;
  // Legacy rows predate href. Only use an actual entity UUID, never deadline_id.
  for (const [key, route] of [
    ["draft_id", "pecas"],
    ["action_item_id", "providencias"],
    ["intimation_id", "intimacoes"],
    ["court_record_id", "processos"],
  ]) {
    const id = notification.payload?.[key];
    if (
      typeof id === "string" &&
      /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)
    )
      return `/${route}/${id}`;
  }
  return null;
}

export function preferenceChannels(
  definition: NotificationTypeDefinition,
  preferences: NotificationPreference[],
) {
  return (
    preferences.find((preference) => preference.type === definition.type)
      ?.channels ?? definition.default_channels
  );
}

export function notificationContext(
  notification: Pick<NotificationView, "payload">,
) {
  const text = (key: string) => {
    const value = notification.payload?.[key];
    return typeof value === "string" ? value.trim() : "";
  };
  return {
    cnj: formatarCNJ(text("cnj")),
    detail: text("detail"),
    title: text("title"),
    processTitle: text("process_title"),
    entityLabel: text("entity_title"),
  };
}

/** Separate the entity identity from the event text without parsing a name out
 * of a generated sentence. Enriched bodies use these exact identifying prefixes. */
export function notificationContent(
  notification: Pick<NotificationView, "payload" | "title" | "body">,
) {
  const context = notificationContext(notification);
  const cnjVariants = [context.cnj, context.cnj.replace(/\D/g, "")].filter(
    Boolean,
  );
  let description = notification.body.trim();
  for (const prefix of [
    context.detail,
    ...cnjVariants.map((cnj) => `Processo ${cnj}`),
  ]) {
    if (prefix && description.startsWith(`${prefix}. `)) {
      description = description.slice(prefix.length + 2).trim();
      break;
    }
  }
  const originTitle = context.title || context.processTitle;
  // BuildCaseTitle can already include the CNJ. Keep it in the dedicated field
  // instead of repeating the same number in the adjacent title.
  const withoutCNJ = (title: string) => {
    const suffix = cnjVariants.find((cnj) => title.endsWith(cnj));
    return suffix
      ? title
          .slice(0, -suffix.length)
          .replace(/[\s·|—–-]+$/g, "")
          .trim()
      : title;
  };
  const titleWithoutCNJ = withoutCNJ(originTitle);
  const relatedTitle = context.entityLabel || withoutCNJ(context.processTitle);
  return {
    ...context,
    entityTitle: titleWithoutCNJ || notification.title,
    eventLabel: notification.title,
    relatedTitle: relatedTitle !== titleWithoutCNJ ? relatedTitle : "",
    description,
    hasEntityTitle: Boolean(
      titleWithoutCNJ && titleWithoutCNJ !== notification.title,
    ),
  };
}
