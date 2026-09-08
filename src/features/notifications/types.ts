export type NotificationChannel = "EMAIL" | "IN_APP";

export interface NotificationTypeDefinition {
  type: string;
  label: string;
  default_channels: NotificationChannel[];
  channels: NotificationChannel[];
}

export interface NotificationView {
  id: string;
  type: string;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export interface PageEnvelope<T> {
  data: T[];
  page: { next_cursor: string | null; limit: number };
}

// An absent preference uses the catalog default; [] is an explicit opt-out.
export interface NotificationPreference {
  type: string;
  channels: NotificationChannel[];
}

export interface DataEnvelope<T> {
  data: T[];
}
