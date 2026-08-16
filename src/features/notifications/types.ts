// Formato do aviso: o read model REST (GET /v1/notifications) devolve isto; o push
// SSE traz o mesmo shape MENOS `read` (um aviso recém-empurrado é sempre não-lido).
export type NotificationType = "import_finished" | "new_andamento" | string;

export type NotificationView = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
};

// Envelope paginado por cursor do BE: { data, page: { next_cursor, limit } }.
export interface PageEnvelope<T> {
  data: T[];
  page: {
    next_cursor: string | null;
    limit: number;
  };
}

// GET/PUT /v1/notifications/preferences: o override salvo do usuário para UM tipo
// de aviso. Ausência de override (o tipo não aparece na lista do GET) = todos os
// canais habilitados (default do BE); ["EMAIL"] presente = canal habilitado,
// ausente = desabilitado. channels: [] é um opt-out explícito e válido.
export type NotificationChannel = "EMAIL" | "IN_APP";

export interface NotificationPreference {
  type: string;
  channels: NotificationChannel[];
}

// Envelope simples {data:[...]} (sem paginação — o conjunto de preferências é
// pequeno), igual ao de membros da organização.
export interface DataEnvelope<T> {
  data: T[];
}
