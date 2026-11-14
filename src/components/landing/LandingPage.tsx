import { useState } from 'react';
import { ArrowRight, Compass, Layers, ShieldCheck, Sparkles } from 'lucide-react';
import { CAREER_PATHWAYS } from '../../data/curriculum';
import { Button, ProgressBar, ResilientImage, SurfaceCard } from '../ui/DesignSystem';
import heroBotanicalAtelier from '../../assets/images/hero_botanical_atelier_1794636558951.jpg';
import featureSkillArchitecture from '../../assets/images/feature_skill_architecture_1794636558572.jpg';
import featureBotanicalPathway from '../../assets/images/feature_botanical_pathway_1794636559515.jpg';

interface LandingPageProps {
  isAuthenticated: boolean;
  onEnterAuth: (initialTab?: 'signin' | 'signup') => void;
  onStartDemoStudent: () => void;
  onOpenWorkspace: () => void;
}

export function LandingPage({
  isAuthenticated,
  onEnterAuth,
  onStartDemoStudent,
  onOpenWorkspace,
}: LandingPageProps) {
  const [previewCareerId, setPreviewCareerId] = useState(CAREER_PATHWAYS[0].id);
  const previewCareer =
    CAREER_PATHWAYS.find((c) => c.id === previewCareerId) ?? CAREER_PATHWAYS[0];

  return (
    <div className="relative z-10 min-h-screen text-[#F7F3EA]">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 border-b border-[rgba(212,175,112,0.14)] bg-[#090A0F]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-8 px-6 py-4">
          <a
            href="#top"
            className="font-display text-lg font-bold tracking-tight text-[#F7F3EA] whitespace-nowrap shrink-0"
          >
            SkillPath AI
          </a>

          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-[#AAA6A0]"
          >
            <a
              href="#capabilities"
              className="hover:text-[#F5D78E] transition-colors whitespace-nowrap shrink-0"
            >
              Capabilities
            </a>
            <a
              href="#architecture"
              className="hover:text-[#F5D78E] transition-colors whitespace-nowrap shrink-0"
            >
              Architecture
            </a>
            <a
              href="#pathways"
              className="hover:text-[#F5D78E] transition-colors whitespace-nowrap shrink-0"
            >
              Pathways
            </a>
            <a
              href="#outcomes"
              className="hover:text-[#F5D78E] transition-colors whitespace-nowrap shrink-0"
            >
              Outcomes
            </a>
          </nav>

          <div className="shrink-0">
            {isAuthenticated ? (
              <Button size="sm" onClick={onOpenWorkspace}>
                Open Workspace
              </Button>
            ) : (
              <Button size="sm" onClick={() => onEnterAuth('signin')}>
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      <main id="top">
        {/* Hero Split Section */}
        <section className="mx-auto max-w-[1280px] px-6 pt-12 pb-16 lg:pt-20 lg:pb-20">
          <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12">
            <div className="flex flex-col justify-between space-y-8 lg:col-span-6 lg:py-4">
              <div className="space-y-6">
                <p className="text-xs font-medium tracking-[0.16em] uppercase text-[#D4AF70]">
                  Academic &amp; Career Intelligence Platform
                </p>
                <h1
                  className="font-display font-bold tracking-tight text-[#F7F3EA] leading-[1.08]"
                  style={{
                    fontSize: 'clamp(2.25rem, 4vw, 3.65rem)',
                    textWrap: 'balance',
                  }}
                >
                  Chart every skill from university mastery to industry readiness.
                </h1>
                <p className="max-w-xl text-base leading-relaxed text-[#AAA6A0]">
                  SkillPath AI unifies diagnostic skill mapping, structured multi-stage learning roadmaps, and coordinated Gemini multi-agent mentorship inside one rigorous academic workspace.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  {isAuthenticated ? (
                    <Button size="lg" onClick={onOpenWorkspace}>
                      Open Student Workspace
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button size="lg" onClick={() => onEnterAuth('signin')}>
                      Continue with Account
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                  <Button size="lg" variant="secondary" onClick={onStartDemoStudent}>
                    Launch Demo Workspace
                  </Button>
                </div>
                <p className="text-xs text-[#7D7973]">
                  Secured with Firebase Authentication · Real-time Firestore state · Gemini 4 multi-agent mentorship
                </p>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="relative h-full min-h-[340px] overflow-hidden rounded-xl border border-[rgba(212,175,112,0.22)] bg-[#11121A]">
                <ResilientImage
                  src={heroBotanicalAtelier}
                  alt="Midnight architectural study atelier illuminated by warm champagne lighting"
                  fallbackTitle="Midnight Study Atelier"
                  className="h-full w-full object-cover"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-[#090A0F] via-[#090A0F]/25 to-transparent"
                />
                <div className="absolute right-0 bottom-0 left-0 p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[rgba(212,175,112,0.22)] pt-4">
                    <div>
                      <p className="text-xs text-[#D4AF70]">Coordinated Intelligence</p>
                      <p className="font-display text-sm font-semibold text-[#F7F3EA]">
                        Diagnostic Telemetry · Career Benchmarking · Adaptive Roadmaps
                      </p>
                    </div>
                    <span className="font-mono-tabular text-xs text-[#F5D78E]">
                      6 Core Pillars
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Full-width 4-column Architectural Specs Row below hero split */}
          <div className="mt-10 grid grid-cols-1 gap-4 border-y border-[rgba(212,175,112,0.16)] py-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <p className="font-mono-tabular text-lg font-semibold text-[#F5D78E]">01 / Diagnostics</p>
              <p className="text-xs text-[#AAA6A0]">
                Six-pillar competency evaluation calibrated against live role thresholds.
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-mono-tabular text-lg font-semibold text-[#F5D78E]">02 / Pathways</p>
              <p className="text-xs text-[#AAA6A0]">
                Structured engineering, machine learning, and quantitative career blueprints.
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-mono-tabular text-lg font-semibold text-[#F5D78E]">03 / Multi-Agent</p>
              <p className="text-xs text-[#AAA6A0]">
                Four coordinated Gemini specialists aligned to your weekly study budget.
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-mono-tabular text-lg font-semibold text-[#F5D78E]">04 / Governance</p>
              <p className="text-xs text-[#AAA6A0]">
                Role-verified student and administrator workspaces with Firestore persistence.
              </p>
            </div>
          </div>
        </section>

        {/* Capabilities Bento Section */}
        <section id="capabilities" className="mx-auto max-w-[1280px] px-6 py-16">
          <div className="mb-10 max-w-2xl space-y-3">
            <p className="text-xs font-medium tracking-[0.14em] uppercase text-[#D4AF70]">
              Core Capabilities
            </p>
            <h2 className="font-display text-2xl font-bold tracking-tight text-[#F7F3EA] sm:text-3xl">
              Designed for measurable academic progression, not superficial checklists.
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <SurfaceCard interactive className="overflow-hidden lg:col-span-7">
              <div className="grid h-full grid-cols-1 md:grid-cols-2">
                <div className="flex flex-col justify-between p-7 space-y-5">
                  <div className="space-y-3">
                    <Compass className="h-5 w-5 text-[#D4AF70]" />
                    <h3 className="font-display text-lg font-semibold text-[#F7F3EA]">
                      01. Precision Skill Gap Mapping
                    </h3>
                    <p className="text-sm leading-relaxed text-[#AAA6A0]">
                      Compare six technical and communication pillars directly against your selected career benchmark. Spot deficits early and track historical diagnostic snapshots across semesters.
                    </p>
                  </div>
                  <p className="text-xs text-[#D4AF70]">
                    Radar visualization · Historical trend tracking · Empirical drills
                  </p>
                </div>
                <div className="min-h-[240px] bg-[#11121A]">
                  <ResilientImage
                    src={featureSkillArchitecture}
                    alt="Precision brushed champagne-gold drafting instruments on dark obsidian slate"
                    fallbackTitle="Precision Diagnostics"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </SurfaceCard>

            <SurfaceCard interactive className="flex flex-col justify-between p-7 lg:col-span-5">
              <div className="space-y-3">
                <Layers className="h-5 w-5 text-[#D4AF70]" />
                <h3 className="font-display text-lg font-semibold text-[#F7F3EA]">
                  02. Multi-Agent Gemini Mentorship
                </h3>
                <p className="text-sm leading-relaxed text-[#AAA6A0]">
                  An orchestrator coordinates four specialized agents—Career Strategist, Curriculum Architect, Technical Tutor, and Assessment Coach—sharing your roadmap state so advice never conflicts.
                </p>
              </div>
              <div className="mt-6 space-y-2 border-t border-[rgba(212,175,112,0.14)] pt-4 text-xs text-[#AAA6A0]">
                <div className="flex justify-between">
                  <span>Career Strategist</span>
                  <span className="text-[#D4AF70]">Role Alignment</span>
                </div>
                <div className="flex justify-between">
                  <span>Curriculum Architect</span>
                  <span className="text-[#D4AF70]">Milestone Pacing</span>
                </div>
                <div className="flex justify-between">
                  <span>Technical Tutor</span>
                  <span className="text-[#D4AF70]">Deep Concept Clarity</span>
                </div>
              </div>
            </SurfaceCard>

            <SurfaceCard interactive className="flex flex-col justify-between p-7 lg:col-span-5">
              <div className="space-y-3">
                <ShieldCheck className="h-5 w-5 text-[#D4AF70]" />
                <h3 className="font-display text-lg font-semibold text-[#F7F3EA]">
                  03. Verified Student &amp; Cohort Governance
                </h3>
                <p className="text-sm leading-relaxed text-[#AAA6A0]">
                  Authenticated Google and email accounts synchronize student profiles to isolated Firestore records, while verified administrators monitor cohort readiness and milestone velocity.
                </p>
              </div>
              <div className="mt-6 border-t border-[rgba(212,175,112,0.14)] pt-4 text-xs text-[#7D7973]">
                Server-verified admin sessions · Strict per-student data isolation
              </div>
            </SurfaceCard>

            <SurfaceCard interactive className="overflow-hidden lg:col-span-7">
              <div className="grid h-full grid-cols-1 md:grid-cols-2">
                <div className="min-h-[240px] bg-[#11121A]">
                  <ResilientImage
                    src={featureBotanicalPathway}
                    alt="Fine-art dark botanical foliage illuminated by subtle champagne-gold light"
                    fallbackTitle="Organic Progression"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-col justify-between p-7 space-y-5">
                  <div className="space-y-3">
                    <Sparkles className="h-5 w-5 text-[#D4AF70]" />
                    <h3 className="font-display text-lg font-semibold text-[#F7F3EA]">
                      04. Stage-by-Stage Learning Roadmaps
                    </h3>
                    <p className="text-sm leading-relaxed text-[#AAA6A0]">
                      Convert career ambition into sequenced milestones with concrete deliverables, curated papers and courses, and Gemini-synthesized supplementary tracks calibrated to your weekly hours.
                    </p>
                  </div>
                  <p className="text-xs text-[#D4AF70]">
                    Stage progression · Deliverable tracking · Adaptive synthesis
                  </p>
                </div>
              </div>
            </SurfaceCard>
          </div>
        </section>

        {/* Architecture / Interactive Pathway Preview */}
        <section id="pathways" className="mx-auto max-w-[1280px] px-6 py-16">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="space-y-5 lg:col-span-5">
              <p className="text-xs font-medium tracking-[0.14em] uppercase text-[#D4AF70]">
                Interactive Pathway Preview
              </p>
              <h2 className="font-display text-2xl font-bold tracking-tight text-[#F7F3EA] sm:text-3xl">
                Inspect industry competency benchmarks before you commit.
              </h2>
              <p className="text-sm leading-relaxed text-[#AAA6A0]">
                Select any engineering or quantitative track below to inspect its required skill thresholds and Stage 01 deliverables.
              </p>

              <div className="space-y-2 pt-2" role="tablist" aria-label="Career pathway selector">
                {CAREER_PATHWAYS.slice(0, 4).map((pathway) => {
                  const active = pathway.id === previewCareer.id;
                  return (
                    <button
                      key={pathway.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setPreviewCareerId(pathway.id)}
                      className={`w-full rounded-lg border px-4 py-3 text-left transition-all ${
                        active
                          ? 'bg-[#171821] border-[#D4AF70] text-[#F7F3EA]'
                          : 'bg-[#11121A] border-[rgba(212,175,112,0.14)] text-[#AAA6A0] hover:border-[rgba(212,175,112,0.32)] hover:text-[#F7F3EA]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-display text-sm font-semibold">{pathway.title}</span>
                        <span className="font-mono-tabular text-xs text-[#D4AF70]">
                          {pathway.demandOutlook}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <SurfaceCard className="p-7 lg:col-span-7">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[rgba(212,175,112,0.14)] pb-5">
                <div className="space-y-1">
                  <p className="text-xs text-[#D4AF70]">
                    {previewCareer.domain} · {previewCareer.compensationRange}
                  </p>
                  <h3 className="font-display text-xl font-bold text-[#F7F3EA]">
                    {previewCareer.title}
                  </h3>
                </div>
                <Button size="sm" variant="secondary" onClick={onStartDemoStudent}>
                  Explore in Demo
                </Button>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-[#AAA6A0]">
                {previewCareer.summary}
              </p>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ProgressBar
                  label="Systems Architecture Target"
                  value={previewCareer.requiredSkills.systems_architecture}
                />
                <ProgressBar
                  label="Applied ML Target"
                  value={previewCareer.requiredSkills.applied_ml}
                />
                <ProgressBar
                  label="Algorithmic Reasoning Target"
                  value={previewCareer.requiredSkills.algorithmic_reasoning}
                />
                <ProgressBar
                  label="Full-Stack Engineering Target"
                  value={previewCareer.requiredSkills.fullstack_engineering}
                />
              </div>

              <div className="mt-6 border-t border-[rgba(212,175,112,0.14)] pt-5">
                <p className="mb-3 text-xs font-medium tracking-wide text-[#D4AF70]">
                  Stage 01 Foundation · {previewCareer.stages[0]?.title}
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {previewCareer.stages[0]?.milestones.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-lg bg-[#11121A] border border-[rgba(212,175,112,0.12)] p-3.5"
                    >
                      <p className="text-sm font-medium text-[#F7F3EA]">{m.title}</p>
                      <p className="mt-1 text-xs text-[#AAA6A0]">
                        {m.durationWeeks} weeks · {m.deliverable}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </SurfaceCard>
          </div>
        </section>

        {/* Architecture & Outcomes Conversion Strip */}
        <section id="architecture" className="mx-auto max-w-[1280px] px-6 py-12">
          <div id="outcomes" className="rounded-xl bg-[#11121A] border border-[rgba(212,175,112,0.2)] p-8 lg:p-12">
            <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
              <div className="max-w-2xl space-y-3">
                <p className="text-xs font-medium tracking-[0.14em] uppercase text-[#D4AF70]">
                  Begin Your Progression
                </p>
                <h2 className="font-display text-2xl font-bold tracking-tight text-[#F7F3EA] sm:text-3xl">
                  Enter with your Google account or inspect the full interactive demo.
                </h2>
                <p className="text-sm leading-relaxed text-[#AAA6A0]">
                  Authenticated student workspaces persist every skill assessment, learning goal, milestone completion, and AI Mentor session to Firestore.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <Button size="lg" onClick={() => onEnterAuth('signin')}>
                  Sign In with Google
                </Button>
                <Button size="lg" variant="secondary" onClick={onStartDemoStudent}>
                  Try Demo Mode
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[rgba(212,175,112,0.14)] bg-[#090A0F]/90">
        <div className="mx-auto flex max-w-[1280px] flex-col items-start justify-between gap-4 px-6 py-8 text-xs text-[#7D7973] sm:flex-row sm:items-center">
          <p className="font-display font-semibold text-[#AAA6A0]">
            SkillPath AI · Academic &amp; Career Intelligence
          </p>
          <div className="flex flex-wrap items-center gap-6">
            <a href="#capabilities" className="hover:text-[#F5D78E] transition-colors">
              Capabilities
            </a>
            <a href="#pathways" className="hover:text-[#F5D78E] transition-colors">
              Pathways
            </a>
            <button
              type="button"
              onClick={() => onEnterAuth('signin')}
              className="hover:text-[#F5D78E] transition-colors"
            >
              Authentication Portal
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
