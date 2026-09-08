"use client";
import { WorkList } from "@/features/action-items/components/work-list";
export function FilaView({ meus, titulo }: { meus?: boolean; titulo: string }) {
  return <WorkList title={titulo} mine={meus} activeOnly />;
}
