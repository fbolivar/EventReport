import { notFound } from "next/navigation";

import { AppSidebar } from "@/components/app/shell/app-sidebar";
import { DEMO_TENANT } from "@/lib/fixtures/tenant";

/**
 * Marco del portal. La sección activa se deduce de la URL en cada página, no
 * de estado de cliente: el portal entero es servidor.
 */
export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  // Con Supabase esto pasa a ser is_tenant_member() + RLS.
  if (tenantId !== DEMO_TENANT.id) notFound();

  return (
    <div className="lg:flex">
      <AppSidebar tenantId={tenantId} />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-app px-6 py-8 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
