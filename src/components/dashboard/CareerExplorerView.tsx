import { useMemo, useState } from 'react';
import { CheckCircle2, Search } from 'lucide-react';
import { CAREER_PATHWAYS, SKILL_CATEGORIES } from '../../data/curriculum';
import type { CareerPathway, StudentProfile } from '../../types/skillpath';
import { calculateOverallReadiness } from '../../utils/skillAnalytics';
import { Button, ModalDialog, ProgressBar, SurfaceCard } from '../ui/DesignSystem';

interface CareerExplorerViewProps {
  profile: StudentProfile;
  onSelectCareer: (careerId: string) => Promise<void>;
}

const DOMAINS: Array<'All' | CareerPathway['domain']> = [
  'All',
  'AI & ML',
  'Systems',
  'Product Engineering',
  'Quantitative',
];

export function CareerExplorerView({ profile, onSelectCareer }: CareerExplorerViewProps) {
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState<'All' | CareerPathway['domain']>('All');
  const [inspectCareer, setInspectCareer] = useState<CareerPathway | null>(null);
  const [adoptingId, setAdoptingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return CAREER_PATHWAYS.filter((career) => {
      const matchesDomain = domainFilter === 'All' || career.domain === domainFilter;
      const matchesQuery =
        !q ||
        career.title.toLowerCase().includes(q) ||
        career.summary.toLowerCase().includes(q) ||
        career.coreCompetencies.some((c) => c.toLowerCase().includes(q));
      return matchesDomain && matchesQuery;
    });
  }, [search, domainFilter]);

  const handleAdopt = async (careerId: string) => {
    setAdoptingId(careerId);
    try {
      await onSelectCareer(careerId);
    } finally {
      setAdoptingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-1 border-b border-[rgba(212,175,112,0.14)] pb-6">
        <p className="text-xs font-medium tracking-[0.12em] uppercase text-[#D4AF70]">
          Industry Benchmarks
        </p>
        <h2 className="font-display text-2xl font-bold text-[#F7F3EA]">Career Explorer</h2>
        <p className="text-sm text-[#AAA6A0]">
          Inspect required skill thresholds, compensation bands, and multi-stage learning pathways.
        </p>
      </div>

      {/* Search & Domain Filter Controls */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="relative w-full lg:max-w-sm">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#7D7973]"
          />
          <input
            type="search"
            aria-label="Search career pathways"
            placeholder="Search roles or competencies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 w-full rounded-lg border border-[rgba(212,175,112,0.2)] bg-[#11121A] pr-4 pl-10 text-sm text-[#F7F3EA] placeholder:text-[#6F6B66] focus:border-[#D4AF70] focus:outline-none"
          />
        </div>

        <div
          role="tablist"
          aria-label="Filter career pathways by domain"
          className="flex flex-wrap items-center gap-1 rounded-lg border border-[rgba(212,175,112,0.14)] bg-[#11121A] p-1"
        >
          {DOMAINS.map((dom) => {
            const active = domainFilter === dom;
            return (
              <button
                key={dom}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setDomainFilter(dom)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#20212B] text-[#F5D78E]'
                    : 'text-[#AAA6A0] hover:text-[#F7F3EA]'
                }`}
              >
                {dom}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <SurfaceCard className="p-8 text-center">
          <p className="font-display text-base font-semibold text-[#F7F3EA]">
            No matching career pathways found
          </p>
          <p className="mt-1 text-sm text-[#AAA6A0]">
            Adjust your search query or reset the domain filter.
          </p>
          <div className="mt-4">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setSearch('');
                setDomainFilter('All');
              }}
            >
              Reset Filters
            </Button>
          </div>
        </SurfaceCard>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {filtered.map((career) => {
            const isSelected = profile.selectedCareerId === career.id;
            const readiness = calculateOverallReadiness(profile.skillScores, career);

            return (
              <SurfaceCard key={career.id} interactive className="flex flex-col justify-between p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-[#D4AF70]">
                        {career.domain} · {career.compensationRange} · {career.demandOutlook}
                      </p>
                      <h3 className="font-display text-xl font-bold text-[#F7F3EA]">
                        {career.title}
                      </h3>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono-tabular text-lg font-semibold text-[#F5D78E]">
                        {readiness}%
                      </p>
                      <p className="text-[11px] text-[#7D7973]">Your Fit</p>
                    </div>
                  </div>

                  <p className="text-sm leading-relaxed text-[#AAA6A0]">{career.summary}</p>

                  <div className="space-y-2 border-t border-[rgba(212,175,112,0.12)] pt-4">
                    <p className="text-xs font-medium text-[#AAA6A0]">Core Competencies</p>
                    <ul className="grid grid-cols-1 gap-1.5 text-xs text-[#F7F3EA] sm:grid-cols-2">
                      {career.coreCompetencies.map((comp) => (
                        <li key={comp} className="truncate">
                          · {comp}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(212,175,112,0.12)] pt-4">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setInspectCareer(career)}
                  >
                    Inspect Skill Thresholds
                  </Button>

                  {isSelected ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#F5D78E]">
                      <CheckCircle2 className="h-4 w-4 text-[#D4AF70]" />
                      Active Target Pathway
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      loading={adoptingId === career.id}
                      onClick={() => handleAdopt(career.id)}
                    >
                      Adopt Pathway
                    </Button>
                  )}
                </div>
              </SurfaceCard>
            );
          })}
        </div>
      )}

      <ModalDialog
        open={Boolean(inspectCareer)}
        title={inspectCareer ? `${inspectCareer.title} · Competency Benchmarks` : ''}
        onClose={() => setInspectCareer(null)}
      >
        {inspectCareer && (
          <div className="space-y-5">
            <p className="text-sm text-[#AAA6A0]">{inspectCareer.summary}</p>
            <div className="space-y-3">
              {SKILL_CATEGORIES.map((cat) => (
                <ProgressBar
                  key={cat.id}
                  label={`${cat.label} (Your Score: ${profile.skillScores[cat.id] ?? 0}%)`}
                  value={inspectCareer.requiredSkills[cat.id] ?? 75}
                />
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setInspectCareer(null)}>
                Close
              </Button>
              {profile.selectedCareerId !== inspectCareer.id && (
                <Button
                  size="sm"
                  loading={adoptingId === inspectCareer.id}
                  onClick={async () => {
                    await handleAdopt(inspectCareer.id);
                    setInspectCareer(null);
                  }}
                >
                  Adopt Pathway
                </Button>
              )}
            </div>
          </div>
        )}
      </ModalDialog>
    </div>
  );
}
