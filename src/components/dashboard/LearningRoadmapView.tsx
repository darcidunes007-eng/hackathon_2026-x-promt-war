import { useState } from 'react';
import { BookOpen, Check, Sparkles } from 'lucide-react';
import { SKILL_CATEGORIES } from '../../data/curriculum';
import { auth } from '../../lib/firebase';
import type { StudentProfile } from '../../types/skillpath';
import {
  calculateOverallReadiness,
  calculateRoadmapProgress,
  getCareerById,
} from '../../utils/skillAnalytics';
import { Button, ProgressBar, SurfaceCard, ToastBanner } from '../ui/DesignSystem';

interface LearningRoadmapViewProps {
  profile: StudentProfile;
  isDemo: boolean;
  onToggleMilestone: (milestoneId: string, milestoneTitle: string, nextCompleted: boolean) => Promise<void>;
}

interface AdaptiveRoadmapResult {
  pathwaySummary: string;
  weeklyCadenceNote: string;
  milestones: Array<{
    title: string;
    durationWeeks: number;
    focusArea: string;
    deliverable: string;
  }>;
}

export function LearningRoadmapView({
  profile,
  isDemo,
  onToggleMilestone,
}: LearningRoadmapViewProps) {
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [adaptiveLoading, setAdaptiveLoading] = useState(false);
  const [adaptiveError, setAdaptiveError] = useState<string | null>(null);
  const [adaptiveResult, setAdaptiveResult] = useState<AdaptiveRoadmapResult | null>(null);

  const career = getCareerById(profile.selectedCareerId);
  const progress = calculateRoadmapProgress(profile.completedMilestones, career);
  const completedSet = new Set(profile.completedMilestones);

  const skillLabelMap = new Map(SKILL_CATEGORIES.map((c) => [c.id, c.label]));

  const handleToggle = async (id: string, title: string) => {
    setTogglingId(id);
    try {
      await onToggleMilestone(id, title, !completedSet.has(id));
    } finally {
      setTogglingId(null);
    }
  };

  const handleGenerateAdaptive = async () => {
    setAdaptiveLoading(true);
    setAdaptiveError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (!isDemo && auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch('/api/ai/roadmap-generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          mode: isDemo ? 'demo' : 'live',
          studentContext: {
            displayName: profile.displayName,
            academicTrack: profile.academicTrack,
            institution: profile.institution,
            graduationYear: profile.graduationYear,
            selectedCareerTitle: career.title,
            readinessScore: calculateOverallReadiness(profile.skillScores, career),
            roadmapPercent: progress.percentage,
            weeklyStudyHours: profile.weeklyStudyHours,
            skillScores: profile.skillScores,
            completedMilestones: profile.completedMilestones,
            careerInterests: profile.careerInterests,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to synthesize adaptive milestones.');
      }
      setAdaptiveResult(data as AdaptiveRoadmapResult);
    } catch (err) {
      setAdaptiveError(
        err instanceof Error ? err.message : 'Unable to reach Gemini roadmap synthesis.'
      );
    } finally {
      setAdaptiveLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 border-b border-[rgba(212,175,112,0.14)] pb-6 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <p className="text-xs font-medium tracking-[0.12em] uppercase text-[#D4AF70]">
            Structured Progression · {career.title}
          </p>
          <h2 className="font-display text-2xl font-bold text-[#F7F3EA]">
            Learning Roadmap
          </h2>
          <p className="text-sm text-[#AAA6A0]">
            Track deliverables across sequenced stages and synthesize custom supplementary sprints.
          </p>
        </div>

        <Button
          size="md"
          variant="secondary"
          loading={adaptiveLoading}
          onClick={handleGenerateAdaptive}
        >
          <Sparkles className="h-4 w-4 text-[#D4AF70]" />
          Synthesize Adaptive Milestones
        </Button>
      </div>

      {/* Overall Roadmap Progress Bar */}
      <SurfaceCard className="p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-base font-semibold text-[#F7F3EA]">
              Overall Pathway Completion
            </h3>
            <p className="text-xs text-[#AAA6A0] tabular-nums">
              {progress.completedCount} of {progress.totalCount} milestones verified · {profile.weeklyStudyHours}h/week cadence
            </p>
          </div>
          <span className="font-mono-tabular text-2xl font-semibold text-[#F5D78E]">
            {progress.percentage}%
          </span>
        </div>
        <ProgressBar value={progress.percentage} showValue={false} />
      </SurfaceCard>

      {adaptiveError && (
        <ToastBanner
          tone="error"
          message={adaptiveError}
          onDismiss={() => setAdaptiveError(null)}
        />
      )}

      {adaptiveResult && (
        <SurfaceCard className="border-[rgba(245,215,142,0.35)] p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[rgba(212,175,112,0.14)] pb-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#D4AF70]">
                Gemini Curriculum Architect Synthesis
              </p>
              <h3 className="font-display text-lg font-semibold text-[#F7F3EA]">
                {adaptiveResult.pathwaySummary}
              </h3>
            </div>
            <span className="text-xs text-[#AAA6A0]">{adaptiveResult.weeklyCadenceNote}</span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {adaptiveResult.milestones.map((m, i) => (
              <div
                key={i}
                className="rounded-lg border border-[rgba(212,175,112,0.16)] bg-[#11121A] p-4 space-y-2"
              >
                <p className="text-xs font-mono-tabular text-[#D4AF70]">
                  {m.durationWeeks} weeks · {m.focusArea}
                </p>
                <p className="font-display text-sm font-semibold text-[#F7F3EA]">{m.title}</p>
                <p className="text-xs text-[#AAA6A0]">{m.deliverable}</p>
              </div>
            ))}
          </div>
        </SurfaceCard>
      )}

      {/* Stage-by-Stage Progression */}
      <div className="space-y-6">
        {career.stages.map((stage) => {
          const stageSummary = progress.stages.find(
            (s) => s.stageNumber === stage.stageNumber
          );
          return (
            <SurfaceCard key={stage.stageNumber} className="p-6">
              <div className="flex flex-col justify-between gap-3 border-b border-[rgba(212,175,112,0.14)] pb-4 sm:flex-row sm:items-center">
                <div className="space-y-1">
                  <p className="font-mono-tabular text-xs text-[#D4AF70]">
                    Stage 0{stage.stageNumber} · {stageSummary?.completed ?? 0}/
                    {stageSummary?.total ?? 0} Complete
                  </p>
                  <h3 className="font-display text-lg font-bold text-[#F7F3EA]">
                    {stage.title}
                  </h3>
                  <p className="text-sm text-[#AAA6A0]">{stage.objective}</p>
                </div>
                <span className="font-mono-tabular text-base font-semibold text-[#F5D78E] shrink-0">
                  {stageSummary?.percentage ?? 0}%
                </span>
              </div>

              <div className="mt-5 divide-y divide-[rgba(212,175,112,0.12)]">
                {stage.milestones.map((milestone) => {
                  const done = completedSet.has(milestone.id);
                  const busy = togglingId === milestone.id;
                  return (
                    <div
                      key={milestone.id}
                      className="flex flex-col justify-between gap-4 py-4 first:pt-1 last:pb-1 lg:flex-row lg:items-start"
                    >
                      <div className="flex items-start gap-3.5">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleToggle(milestone.id, milestone.title)}
                          aria-label={`Toggle milestone "${milestone.title}" as ${
                            done ? 'incomplete' : 'complete'
                          }`}
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                            done
                              ? 'border-[#D4AF70] bg-[#D4AF70] text-[#090A0F]'
                              : 'border-[rgba(212,175,112,0.35)] bg-[#11121A] text-transparent hover:border-[#F5D78E]'
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>

                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <p
                              className={`font-display text-sm font-semibold ${
                                done ? 'text-[#AAA6A0] line-through' : 'text-[#F7F3EA]'
                              }`}
                            >
                              {milestone.title}
                            </p>
                            <span className="text-xs text-[#7D7973]">
                              · {milestone.durationWeeks} weeks ·{' '}
                              {skillLabelMap.get(milestone.focusSkill) ?? milestone.focusSkill}
                            </span>
                          </div>
                          <p className="text-xs text-[#AAA6A0]">
                            Deliverable: {milestone.deliverable}
                          </p>
                        </div>
                      </div>

                      <div className="ml-8 flex flex-col gap-1.5 lg:ml-0 lg:w-72 lg:shrink-0">
                        {milestone.resources.map((res) => (
                          <div
                            key={res.title}
                            className="flex items-center gap-2 rounded-md border border-[rgba(212,175,112,0.12)] bg-[#11121A] px-3 py-2 text-xs text-[#AAA6A0]"
                          >
                            <BookOpen className="h-3.5 w-3.5 shrink-0 text-[#D4AF70]" />
                            <span className="truncate text-[#F7F3EA]">{res.title}</span>
                            <span className="ml-auto shrink-0 text-[11px] text-[#7D7973]">
                              {res.format}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </SurfaceCard>
          );
        })}
      </div>
    </div>
  );
}
