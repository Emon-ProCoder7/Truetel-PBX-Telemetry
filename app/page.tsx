import { getDashboardOverview } from "@/lib/dashboard/queries";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

// Always live — never statically prerendered, so build never has to reach the DB
// and every visit reflects the latest calls.
export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await getDashboardOverview("today");
  return <DashboardClient initialData={data} />;
}
