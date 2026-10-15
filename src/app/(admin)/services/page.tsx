import { requireStaffPage } from "@/server/auth/session";
import { listServices } from "@/server/services/catalog";
import { getAgency } from "@/server/services/settings";
import { PageHeader } from "@/components/shared/layout";
import { ServiceCatalog } from "@/components/services/service-catalog";

export const metadata = { title: "Services" };

export default async function ServicesPage() {
  const user = await requireStaffPage();
  const isAdmin = user.role === "admin";
  const [services, agency] = await Promise.all([listServices({ includeHidden: isAdmin }), getAgency()]);
  return (
    <div className="animate-fade-in">
      <PageHeader title="Services" description="Your services and prices. Pick what a client needs to see the total instantly." />
      <ServiceCatalog services={services} isAdmin={isAdmin} agencyName={agency.name} />
    </div>
  );
}
