import { createFileRoute } from "@tanstack/react-router";
import {
  listCompanies,
  listContacts,
  listDeals,
  listActivities,
  listCampaigns,
  listScreens,
} from "@/lib/api/crm.functions";
import { AccountPage } from "@/features/accounts/components/AccountPage";

export const Route = createFileRoute("/_app/companies")({
  head: () => ({ meta: [{ title: "Accounts — Tathep CRM" }] }),
  loader: async () => {
    const [companies, contacts, deals, activities, campaigns, screens] = await Promise.all([
      listCompanies(),
      listContacts(),
      listDeals(),
      listActivities(),
      listCampaigns(),
      listScreens(),
    ]);
    return { companies, contacts, deals, activities, campaigns, screens };
  },
  component: AccountsRoute,
});

function AccountsRoute() {
  const data = Route.useLoaderData();
  return <AccountPage {...data} />;
}
