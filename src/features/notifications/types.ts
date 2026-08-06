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
