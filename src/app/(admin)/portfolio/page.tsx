import { requireStaffPage } from "@/server/auth/session";
import { listPortfolio, projectsWithLiveUrl } from "@/server/services/portfolio";
import { PageHeader } from "@/components/shared/layout";
import { PortfolioGrid } from "@/components/portfolio/portfolio-grid";

export const metadata = { title: "Portfolio" };

export default async function PortfolioPage() {
  const user = await requireStaffPage();
  const isAdmin = user.role === "admin";
  // Only admins manage the portfolio, so only they need the project shortcut list.
  const [items, liveProjects] = await Promise.all([listPortfolio(), isAdmin ? projectsWithLiveUrl() : Promise.resolve([])]);
  return (
    <div className="animate-fade-in">
      <PageHeader title="Portfolio" description="Websites and apps we've delivered. Click any project to open the live site." />
      <PortfolioGrid items={items} isAdmin={isAdmin} liveProjects={liveProjects} />
    </div>
  );
}
