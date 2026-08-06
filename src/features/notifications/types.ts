// Formato do aviso empurrado pelo BE no stream SSE (o publisher do worker serializa
// {id,type,title,body,created_at} no canal notif:{tenant}). É o mesmo shape que os
// read models REST devolvem (3a), então serve para lista e para o push.
export type NotificationType = "import_finished" | "new_andamento" | string;

export type NotificationView = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  created_at: string;
};
