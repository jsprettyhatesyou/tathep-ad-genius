import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AIPanel } from "@/components/crm/ai-panel";
import { Sparkles, Video, MessageCircleQuestion, Clapperboard } from "lucide-react";
import type { ReactNode } from "react";
import type { ContentPlan } from "@/lib/mock-data";

function Section({ icon: Icon, title, children }: { icon: typeof Sparkles; title: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <Icon className="h-3.5 w-3.5 text-fresco" /> {title}
      </p>
      {children}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="list-disc space-y-1 pl-4 text-sm text-slate-700">
      {items.map((t, i) => <li key={i}>{t}</li>)}
    </ul>
  );
}

// Shared detail rendering — used inline (Account "Content Plan" tab) and inside the Sheet below.
export function ContentPlanDetail({ plan }: { plan: ContentPlan }) {
  return (
    <div className="space-y-5">
      <Section icon={Sparkles} title="Content Objective">
        <p className="text-sm font-medium text-slate-800">{plan.contentObjective}</p>
        <p className="text-xs text-muted-foreground">{plan.contentObjectiveReasoning}</p>
      </Section>

      <Section icon={Clapperboard} title="Recommended Content Format">
        <ul className="space-y-1.5">
          {plan.recommendedFormats.map((f, i) => (
            <li key={i} className="rounded-md border border-border/60 bg-white p-2 text-sm">
              <span className="font-medium text-slate-800">{f.format}</span>
              <p className="mt-0.5 text-xs text-muted-foreground">{f.reasoning}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section icon={Video} title="Recording Guide">
        <div className="space-y-2 rounded-md border border-border/60 bg-white p-3 text-sm">
          <p><span className="font-medium">Opening Hook:</span> {plan.recordingGuide.openingHook}</p>
          <div>
            <p className="font-medium">Shot List</p>
            <BulletList items={plan.recordingGuide.shotList} />
          </div>
          <div>
            <p className="font-medium">B-roll</p>
            <BulletList items={plan.recordingGuide.bRoll} />
          </div>
          <div>
            <p className="font-medium">Interview Questions (ระหว่างถ่ายทำ)</p>
            <BulletList items={plan.recordingGuide.interviewQuestions} />
          </div>
          <p><span className="font-medium">Closing Scene:</span> {plan.recordingGuide.closingScene}</p>
        </div>
      </Section>

      <Section icon={MessageCircleQuestion} title="Suggested Interview Questions">
        <BulletList items={plan.suggestedInterviewQuestions} />
      </Section>

      <Section icon={Sparkles} title="Suggested Hook">
        <BulletList items={plan.suggestedHooks} />
      </Section>

      <div className="rounded-lg bg-fresco/5 p-3">
        <p className="text-xs font-semibold text-fresco">เหตุผลโดยรวม</p>
        <p className="mt-0.5 text-sm text-slate-700">{plan.reasoning}</p>
      </div>
    </div>
  );
}

export function ContentPlanSheet({
  open,
  onOpenChange,
  plan,
  loading,
  onRegenerate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plan: ContentPlan | null;
  loading: boolean;
  onRegenerate?: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>
            {plan?.businessRef?.name ? `Content Plan · ${plan.businessRef.name}` : "Content Plan"}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4">
          <AIPanel
            title="น้องตาเทพ Content Plan"
            subtitle={plan?.businessType}
            loading={loading}
            onGenerate={onRegenerate}
            actionLabel="สร้างใหม่"
          >
            {plan && <ContentPlanDetail plan={plan} />}
          </AIPanel>
        </div>
      </SheetContent>
    </Sheet>
  );
}
