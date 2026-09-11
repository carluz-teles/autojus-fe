"use client";

import { type MouseEvent, useState } from "react";

import { demoNotifications } from "../content";

export function useProductDemo() {
  const [selectedId, setSelectedId] = useState<string>(demoNotifications[0].id);
  const select = (event: MouseEvent<HTMLButtonElement>) => {
    const id = event.currentTarget.dataset.notification;
    if (demoNotifications.some((item) => item.id === id)) setSelectedId(id!);
  };
  const selected =
    demoNotifications.find((item) => item.id === selectedId) ??
    demoNotifications[0];
  return { selected, select };
}
