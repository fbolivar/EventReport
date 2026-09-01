import { notFound } from "next/navigation";

import { AppSidebar } from "@/components/app/shell/app-sidebar";
import { getTenant, listCollectors } from "@/lib/data/tenant";

/**
 * Marco del portal. El acceso lo decide la membresía, no la URL: si el tenant
 * del enlace no aparece para este usuario es porque RLS no se lo entrega.
 */
export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const tenant = await getTenant(tenantId);
  if (!tenant) notFound();

  const collectors = await listCollectors();

  return (
    <div className="lg:flex">
      <AppSidebar
        tenantId={tenantId}
        tenantName={tenant.name}
        plan={tenant.plan}
        collectors={collectors.map((collector) => ({
          id: collector.id,
          name: collector.name,
          status: collector.health.status,
        }))}
      />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-app px-6 py-8 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
