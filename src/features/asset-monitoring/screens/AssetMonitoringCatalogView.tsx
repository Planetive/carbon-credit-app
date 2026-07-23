import type { ReactNode } from "react";
import { ArrowRight, Flame, Factory, Leaf, Sprout, Sun, SunMedium } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  MRV_CATALOG_SECTIONS,
  type MrvCatalogModule,
  type MrvCatalogSection,
  type MrvModuleStatus,
} from "@/features/asset-monitoring/mrvCatalog";

const GRID_CLASS =
  "grid w-full grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3";

const SECTION_SHELL =
  "rounded-[22px] border border-[#EEF2F2] bg-white/75 p-6 backdrop-blur-sm";

const CARD_SHELL =
  "group relative flex h-full min-h-[248px] flex-col rounded-[18px] border border-[#E8EEF0] bg-white p-5 shadow-[0_6px_20px_rgba(15,23,42,0.05)] outline-none transition-[transform,box-shadow,border-color] duration-200 ease-in-out will-change-transform hover:-translate-y-1 hover:border-[#B8DCCF] hover:shadow-[0_14px_34px_rgba(15,23,42,0.10)] motion-reduce:transition-none motion-reduce:hover:translate-y-0";

const sectionIcons = {
  agriculture: Sprout,
  renewable: SunMedium,
  biochar: Flame,
  ccus: Factory,
} as const;

const moduleIcons: Record<string, typeof Sprout> = {
  "vert-os": Sprout,
  terra: Sun,
  helios: Flame,
  sequest: Factory,
};

const sectionHeaderTone: Record<
  MrvCatalogSection["iconKey"],
  { container: string; icon: string }
> = {
  agriculture: { container: "bg-[#ECFDF3] text-[#15803D]", icon: "text-[#15803D]" },
  renewable: { container: "bg-[#EFF6FF] text-[#2563EB]", icon: "text-[#2563EB]" },
  biochar: { container: "bg-[#F0FDF4] text-[#166534]", icon: "text-[#166534]" },
  ccus: { container: "bg-[#F1F5F9] text-[#475569]", icon: "text-[#475569]" },
};

const iconContainerBg: Record<MrvCatalogSection["iconKey"], string> = {
  agriculture: "bg-[#ECFDF3] group-hover:bg-[#DDF9EB]",
  renewable: "bg-[#EFF6FF] group-hover:bg-[#E0EDFF]",
  biochar: "bg-[#F0FDF4] group-hover:bg-[#E3F9EA]",
  ccus: "bg-[#F1F5F9] group-hover:bg-[#E2E8F0]",
};

const statusBadge: Record<MrvModuleStatus, { label: string; className: string }> = {
  preview: {
    label: "Preview",
    className: "border-[#DBEAFE] bg-[#EFF6FF]/70 text-[#1D4ED8]",
  },
  coming_soon: {
    label: "Coming Soon",
    className: "border-[#E2E8F0] bg-[#F8FAFC]/85 text-[#64748B]",
  },
  live: {
    label: "Live",
    className: "border-[#DCFCE7] bg-[#ECFDF3]/70 text-[#15803D]",
  },
};

const DESKTOP_COLUMNS = 3;
const MEDIUM_COLUMNS = 2;

function moduleCtaLabel(status: MrvModuleStatus): string {
  if (status === "live") return "Open Workspace";
  if (status === "preview") return "Learn More";
  return "Learn More";
}

function placeholderSlotClass(index: number, placeholderMedium: number): string {
  return index < placeholderMedium ? "hidden w-full md:block" : "hidden w-full lg:block";
}

function MrvLauncherCard({
  mod,
  sectionIconKey,
  onOpen,
}: {
  mod: MrvCatalogModule;
  sectionIconKey: MrvCatalogSection["iconKey"];
  onOpen: () => void;
}) {
  const ModIcon = moduleIcons[mod.id] ?? sectionIcons[sectionIconKey];
  const badge = statusBadge[mod.status];
  const cta = moduleCtaLabel(mod.status);
  const tone = sectionHeaderTone[sectionIconKey];

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`${mod.name}. ${mod.subtitle}. ${badge.label}.`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`${CARD_SHELL} cursor-pointer focus-visible:border-[#94D3BE] focus-visible:shadow-[0_0_0_6px_rgba(15,118,110,0.08),0_14px_34px_rgba(15,23,42,0.10)] focus-visible:ring-2 focus-visible:ring-[#0F766E]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F8FAF8]`}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] transition-[transform,background-color] duration-200 ease-in-out group-hover:scale-[1.03] ${iconContainerBg[sectionIconKey]}`}
          >
            <ModIcon
              className={`h-6 w-6 ${tone.icon} transition-transform duration-200 ease-in-out group-hover:-translate-y-px motion-reduce:group-hover:translate-y-0`}
              strokeWidth={2}
              aria-hidden
            />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-[22px] font-bold leading-[28px] tracking-[-0.02em] text-[#0F172A]">
              {mod.name}
            </h3>
            <p className="truncate text-[13px] font-medium leading-[20px] text-[#64748B]">
              {mod.subtitle}
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={`h-6 shrink-0 rounded-full border px-2.5 text-[11px] font-medium ${badge.className}`}
        >
          {badge.label}
        </Badge>
      </div>

      <p className="mt-3 min-h-[66px] line-clamp-3 text-[13px] font-normal leading-[22px] text-[#475569]">
        {mod.cardDescription}
      </p>

      <div className="my-5 h-px w-full bg-[#EEF2F2]" aria-hidden />

      <p className="shrink-0 text-center text-[12px] font-medium leading-5 text-[#0F766E]">
        {mod.capabilities}
      </p>

      <div className="mt-auto flex justify-end pt-3">
        <span className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[#0F766E] bg-white px-4 text-[13px] font-medium text-[#0F766E] transition-colors duration-200 ease-in-out group-hover:bg-[#0F766E] group-hover:text-white">
          {cta}
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform duration-200 ease-in-out group-hover:translate-x-1 motion-reduce:group-hover:translate-x-0"
            aria-hidden
          />
        </span>
      </div>
    </article>
  );
}

function MoreModulesPlaceholderCard() {
  return (
    <div
      className="flex h-full min-h-[248px] flex-col items-center justify-center rounded-[18px] border-2 border-dashed border-[#DCE6E3] bg-transparent p-5 text-center"
      aria-hidden
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-[#DCE6E3] bg-[#F1F5F9]">
        <Leaf className="h-5 w-5 text-[#0F766E]" strokeWidth={2} />
      </div>
      <p className="text-[14px] font-semibold leading-5 text-[#0F172A]">More modules coming soon</p>
      <p className="mt-1.5 text-[11px] leading-4 text-[#64748B]">
        Additional MRV solutions will appear here.
      </p>
    </div>
  );
}

function SectionBlock({ section }: { section: MrvCatalogSection }) {
  const SectionIcon = sectionIcons[section.iconKey];
  const { toast } = useToast();
  const headerTone = sectionHeaderTone[section.iconKey];
  const headingId = `mrv-section-${section.id}`;

  const placeholderDesktop = Math.max(0, DESKTOP_COLUMNS - section.modules.length);
  const placeholderMedium = Math.max(0, MEDIUM_COLUMNS - section.modules.length);

  const openModule = (mod: MrvCatalogModule) => {
    // Paste real module URLs here when ready
    const MODULE_URLS: Record<string, string> = {
      "vert-os": "https://hydroponics-planetive.vercel.app",
      helios: "https://bio-char-mrv-api-server.vercel.app",
      terra: "https://bess-beacon-core.vercel.app/login",
    };

    const url = MODULE_URLS[mod.id];
    if (url) {
      window.location.assign(url);
      return;
    }

    toast({
      title: "Coming soon",
      description: `${mod.name} monitoring workflows are in development.`,
    });
  };

  return (
    <section aria-labelledby={headingId}>
      <div className={SECTION_SHELL}>
        <header className="flex items-center gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] ${headerTone.container}`}
          >
            <SectionIcon className={`h-6 w-6 ${headerTone.icon}`} strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0">
            <h2
              id={headingId}
              className="text-[28px] font-bold leading-[34px] tracking-[-0.02em] text-[#0F172A]"
            >
              {section.title}
            </h2>
            {section.summary && (
              <p className="mt-1.5 max-w-2xl text-[14px] font-normal leading-[24px] text-[#64748B]">
                {section.summary}
              </p>
            )}
          </div>
        </header>

        <div className={`${GRID_CLASS} mt-6`}>
          {section.modules.map((mod) => (
            <MrvLauncherCard
              key={mod.id}
              mod={mod}
              sectionIconKey={section.iconKey}
              onOpen={() => openModule(mod)}
            />
          ))}
          {Array.from({ length: placeholderDesktop }).map((_, index) => (
            <div key={`placeholder-${section.id}-${index}`} className={placeholderSlotClass(index, placeholderMedium)}>
              <MoreModulesPlaceholderCard />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const AssetMonitoringCatalogView = ({ headerAccessory }: { headerAccessory?: ReactNode }) => {
  return (
    <div className="relative min-h-full overflow-hidden bg-[#F8FAF8]">
      <div
        className="pointer-events-none absolute right-0 top-0 h-[360px] w-[min(540px,45vw)] opacity-[0.12]"
        aria-hidden
        style={{
          background:
            "radial-gradient(65% 60% at 80% 20%, rgba(15,118,110,0.22) 0%, rgba(15,118,110,0.06) 40%, rgba(248,250,248,0) 72%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.012]"
        aria-hidden
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(15,23,42,1) 1px, transparent 0)",
          backgroundSize: "18px 18px",
        }}
      />

      <div className="relative mx-auto max-w-[1280px] space-y-12 px-5 pb-8 pt-8 md:px-10 md:pt-10">
        {headerAccessory ? <div className="flex justify-end">{headerAccessory}</div> : null}
        <header className="max-w-3xl">
          <h1 className="text-[30px] font-bold leading-[36px] tracking-[-0.02em] text-[#0F172A]">
            MRV modules
          </h1>
          <p className="mt-2 text-[13px] font-normal leading-[22px] text-[#475569]">
            Select a monitoring, reporting, and verification workspace to continue. Each module opens
            its own dedicated workflow for implementation.
          </p>
        </header>

        <div className="space-y-12">
          {MRV_CATALOG_SECTIONS.map((section) => (
            <SectionBlock key={section.id} section={section} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AssetMonitoringCatalogView;
