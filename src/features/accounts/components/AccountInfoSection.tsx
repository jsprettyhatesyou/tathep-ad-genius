import { MapPin, Globe, Phone } from "lucide-react";
import { TierBadge, StatusBadge, ClientTypeBadge } from "@/components/crm/badges";
import type { Company } from "@/lib/mock-data";

function Field({ label, value, icon: Icon }: { label: string; value?: string; icon?: any }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
        {value || "—"}
      </p>
    </div>
  );
}

const SOCIALS = (c: Company) =>
  ([
    ["Facebook", c.facebookUrl],
    ["Instagram", c.instagramUrl],
    ["LinkedIn", c.linkedinUrl],
    ["TikTok", c.tiktokUrl],
  ] as const).filter(([, url]) => !!url);

export function AccountInfoSection({ company }: { company: Company }) {
  const clientType = company.clientType ?? company.type;
  const socials = SOCIALS(company);
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-foreground">Account Information</h3>
      <div className="rounded-xl border border-border bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <ClientTypeBadge value={clientType} />
          <StatusBadge status={company.status} />
          <TierBadge tier={company.tier} />
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          <Field label="Company" value={company.name} />
          <Field label="Client Type" value={clientType} />
          <Field label="Industry" value={company.industry} />
          <Field label="Province" value={company.province} icon={MapPin} />
          <Field label="Company Size" value={company.size} />
          <Field label="Annual Budget" value={company.annualBudget} />
          <Field label="Tier" value={company.tier} />
          <Field label="Account Status" value={company.status} />
          <Field label="Owner" value={company.assignedTo} />
          <Field label="Account Score" value={`${company.leadScore}/100`} />
          <Field label="Source" value={company.source} />
          {company.phone && <Field label="เบอร์กลาง" value={company.phone} icon={Phone} />}
          {company.website && <Field label="Website" value={company.website} icon={Globe} />}
        </div>

        {socials.length > 0 && (
          <div className="mt-3 border-t border-border/60 pt-3">
            <p className="mb-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">Social Links</p>
            <div className="flex flex-wrap gap-2">
              {socials.map(([name, url]) => (
                <a
                  key={name}
                  href={(url as string).startsWith("http") ? (url as string) : `https://${url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-border bg-white px-2.5 py-1 text-xs font-medium text-fresco hover:bg-fresco/5"
                >
                  {name}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
