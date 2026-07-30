import { ComingSoon, PageHeader } from "@/components/shell/page-header";

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Visão geral dos seus processos e integrações."
      />
      <ComingSoon note="Widgets do dashboard chegam na FE-2." />
    </>
  );
}
