// Account view-model types for the revamped Accounts module.
//
// The persisted record stays the existing `Company` (Supabase `companies` table).
// Everything below is DERIVED at runtime from related records (deals, contacts,
// activities, campaigns) — no schema migration required. Sections consume these
// computed shapes so the Accounts page can answer:
//   "บริษัทนี้คือใคร มีมูลค่าเท่าไหร่ เคยทำอะไรกับเรา มีใครต้องติดต่อ และควรทำอะไรต่อ"
import type { Company } from "@/lib/mock-data";

export type { Company };

// Aggregated revenue + relationship metrics shown in the summary cards.
export interface AccountMetrics {
  lifetimeRevenue: number;
  revenueYTD: number;
  openOpportunities: number;
  closedWonOpportunities: number;
  openPipelineValue: number;
  totalCampaigns: number;
  lastCampaignDate?: string;
  lastActivityAt?: string;
  nextFollowUpAt?: string;
}

// A next-action / task. Synthesized from planned activities + deal follow-ups
// (there is no dedicated tasks table yet).
export interface AccountTask {
  id: string;
  title: string;
  dueDate?: string;
  owner?: string;
  status: string; // Planned / Done / Missed / …
  priority: "Urgent" | "High" | "Medium" | "Low";
  source: "activity" | "deal";
  overdue: boolean;
  refId?: string; // underlying activity/deal id
}

export type RiskLevel = "high" | "medium" | "low";

export interface AccountRisk {
  key: "low_activity" | "no_decision_maker" | "payment_delay" | "creative_not_ready";
  level: RiskLevel;
  title: string;
  detail: string;
}

// AI-generated insight payload (Research / Sales Strategy / Talking Points).
export interface AccountAIInsight {
  research: {
    summary: string;
    industry: string;
    location: string;
    companySize: string;
    growthSignals: string[];
    marketingMoments: string[];
  };
  strategy: {
    recommendedPackage: string;
    recommendedLocations: string[];
    suggestedBudget: string;
    bestTiming: string;
    upsell: string;
  };
  talkingPoints: string[];
}
