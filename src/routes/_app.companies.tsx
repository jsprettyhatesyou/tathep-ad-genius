import { createFileRoute } from "@tanstack/react-router";
import {
  listCompanies,
  listContacts,
  listDeals,
  listActivities,
  listScreens,
} from "@/lib/api/crm.functions";
import { AccountPage } from "@/features/accounts/components/AccountPage";

export const Route = createFileRoute("/_app/companies")({
  head: () => ({ meta: [{ title: "Accounts — Tathep CRM" }] }),
  validateSearch: (s: Record<string, unknown>): { companyId?: string } => ({
    companyId: typeof s.companyId === "string" ? s.companyId : undefined,
  }),
  loader: async () => {
    const [companies, contacts, deals, activities, screens] = await Promise.all([
      listCompanies(),
      listContacts(),
      listDeals(),
      listActivities(),
      listScreens(),
    ]);
    return { companies, contacts, deals, activities, screens };
  },
  component: AccountsRoute,
});

function AccountsRoute() {
  const data = Route.useLoaderData();
  const { companyId } = Route.useSearch();
  return <AccountPage {...data} initialSelectedId={companyId} />;
}
