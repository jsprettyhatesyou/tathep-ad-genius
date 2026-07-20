import { Building2, Pencil, UserPlus, Plus, Activity as ActivityIcon, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteConfirm } from "@/components/crm/form-kit";
import { ClientTypeBadge, StatusBadge, TierBadge } from "@/components/crm/badges";
import type { Company, Contact, Deal, Activity, Screen } from "@/lib/mock-data";
import type { AccountMetrics, AccountTask, AccountRisk, AccountAIInsight } from "../types/account";
import { AccountSummaryCards } from "./AccountSummaryCards";
import { AccountInfoSection } from "./AccountInfoSection";
import { AccountAIInsightTabs } from "./AccountAIInsightTabs";
import { AccountContactsSection } from "./AccountContactsSection";
import { AccountOpportunitiesSection } from "./AccountOpportunitiesSection";
import { AccountTasksSection } from "./AccountTasksSection";
import { AccountActivitiesTimeline } from "./AccountActivitiesTimeline";

export interface AccountDetailProps {
  company: Company;
  contacts: Contact[];
  deals: Deal[];
  activities: Activity[];
  screens: Screen[];
  metrics: AccountMetrics;
  tasks: AccountTask[];
  risks: AccountRisk[];
  insight: AccountAIInsight | null;
  insightLoading: boolean;
  onGenerateInsight: () => void;
  classifying: boolean;
  onClassify: () => void;
  aiTab: string;
  onAiTab: (v: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddContact: () => void;
  onViewContact: (c: Contact) => void;
  onCreateOpportunity: () => void;
  onLogActivity: () => void;
  onAddNote: () => void;
  onCreateTask: () => void;
}

export function AccountDetailPanel(p: AccountDetailProps) {
  const { company } = p;
  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-background">
      {/* sticky header + quick actions */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-5 py-3.5 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 truncate text-lg font-semibold">
              <Building2 className="h-4 w-4 text-fresco" /> {company.name}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <ClientTypeBadge value={company.clientType ?? company.type} />
              <StatusBadge status={company.status} />
              <TierBadge tier={company.tier} />
              {company.industry && <span className="text-xs text-muted-foreground">· {company.industry}</span>}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={p.onEdit}><Pencil className="h-4 w-4" /> Edit</Button>
          <Button variant="outline" size="sm" onClick={p.onAddContact}><UserPlus className="h-4 w-4" /> Add Contact</Button>
          <Button variant="outline" size="sm" onClick={p.onCreateOpportunity}><Plus className="h-4 w-4" /> Create Opportunity</Button>
          <Button variant="outline" size="sm" onClick={p.onLogActivity}><ActivityIcon className="h-4 w-4" /> Log Activity</Button>
          <Button variant="outline" size="sm" onClick={p.onCreateTask}><CheckSquare className="h-4 w-4" /> Create Task</Button>
          <DeleteConfirm onConfirm={p.onDelete} description={`ลบ "${company.name}" และดีลที่เกี่ยวข้องทั้งหมด`} />
        </div>
      </div>

      {/* scrollable body */}
      <div className="flex-1 space-y-6 overflow-y-auto p-5">
        <AccountSummaryCards metrics={p.metrics} />
        <AccountInfoSection company={company} />

        <section>
          <h3 className="mb-2 text-sm font-semibold text-foreground">AI Insights · น้องตาเทพ</h3>
          <AccountAIInsightTabs
            company={company}
            metrics={p.metrics}
            risks={p.risks}
            insight={p.insight}
            loading={p.insightLoading}
            onGenerate={p.onGenerateInsight}
            classifying={p.classifying}
            onClassify={p.onClassify}
            value={p.aiTab}
            onValueChange={p.onAiTab}
          />
        </section>

        <AccountContactsSection contacts={p.contacts} onAdd={p.onAddContact} onView={p.onViewContact} />
        <AccountOpportunitiesSection
          deals={p.deals}
          company={company}
          contacts={p.contacts}
          screens={p.screens}
          onCreate={p.onCreateOpportunity}
        />
        <AccountTasksSection tasks={p.tasks} onCreate={p.onCreateTask} />
        <AccountActivitiesTimeline activities={p.activities} onLog={p.onLogActivity} onNote={p.onAddNote} onTask={p.onCreateTask} />
      </div>
    </div>
  );
}
