import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { SKILL_CATEGORIES } from '../../data/curriculum';
import { auth } from '../../lib/firebase';
import type {
  SkillAssessmentRecord,
  SkillCategoryId,
  StudentProfile,
} from '../../types/skillpath';
import {
  calculateAverageSkillScore,
  calculateOverallReadiness,
  calculateSkillGaps,
  getCareerById,
} from '../../utils/skillAnalytics';
import { Button, ProgressBar, SurfaceCard, ToastBanner } from '../ui/DesignSystem';
import { AssessmentTrendChart, SkillRadarChart } from '../ui/SkillCharts';

interface SkillAnalysisViewProps {
  profile: StudentProfile;
  assessments: SkillAssessmentRecord[];
  isDemo: boolean;
  onSaveAssessment: (
    updatedScores: Record<SkillCategoryId, number>,
    overallScore: number,
    note: string
  ) => Promise<void>;
}

interface GeminiSkillInsight {
  headline: string;
  priorityGap: string;
  diagnosticSummary: string;
  recommendedDrills: string[];
}

export function SkillAnalysisView({
  profile,
  assessments,
  isDemo,
  onSaveAssessment,
}: SkillAnalysisViewProps) {
  const [draftScores, setDraftScores] = useState<Record<SkillCategoryId, number>>(
    () => ({ ...profile.skillScores })
  );
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [insight, setInsight] = useState<GeminiSkillInsight | null>(null);

  const career = getCareerById(profile.selectedCareerId);
  const readiness = calculateOverallReadiness(draftScores, career);
  const compositeMean = calculateAverageSkillScore(draftScores);
  const gaps = calculateSkillGaps(draftScores, career);

  const strengths = gaps.filter((g) => g.delta >= 0);
  const improvements = gaps.filter((g) => g.delta < 0);

  const handleSliderChange = (id: SkillCategoryId, value: number) => {
    setDraftScores((prev) => ({ ...prev, [id]: value }));
  };

  const handleSaveSnapshot = async () => {
    setSaving(true);
    setSaveNotice(null);
    try {
      await onSaveAssessment(
        draftScores,
        compositeMean,
        `Self-diagnostic snapshot aligned to ${career.title} (${readiness}% readiness).`
      );
      setSaveNotice('Diagnostic snapshot recorded and skill telemetry updated.');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateInsight = async () => {
    setInsightLoading(true);
    setInsightError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (!isDemo && auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch('/api/ai/skill-insight', {
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
            readinessScore: readiness,
            weeklyStudyHours: profile.weeklyStudyHours,
            skillScores: draftScores,
            completedMilestones: profile.completedMilestones,
            careerInterests: profile.careerInterests,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to generate Gemini skill insight.');
      }
      setInsight(data as GeminiSkillInsight);
    } catch (err) {
      setInsightError(
        err instanceof Error ? err.message : 'Unable to reach Gemini diagnostic endpoint.'
      );
    } finally {
      setInsightLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 border-b border-[rgba(212,175,112,0.14)] pb-6 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <p className="text-xs font-medium tracking-[0.12em] uppercase text-[#D4AF70]">
            Competency Diagnostics
          </p>
          <h2 className="font-display text-2xl font-bold text-[#F7F3EA]">
            Skill Analysis &amp; Historical Progression
          </h2>
          <p className="text-sm text-[#AAA6A0]">
            Benchmarking six core competencies against <span className="text-[#F7F3EA]">{career.title}</span>.
          </p>
        </div>

        <Button
          size="md"
          variant="secondary"
          loading={insightLoading}
          onClick={handleGenerateInsight}
        >
          <Sparkles className="h-4 w-4 text-[#D4AF70]" />
          Generate Gemini Insight
        </Button>
      </div>

      {saveNotice && (
        <ToastBanner
          tone="success"
          message={saveNotice}
          onDismiss={() => setSaveNotice(null)}
        />
      )}

      {insightError && (
        <ToastBanner
          tone="error"
          message={insightError}
          onDismiss={() => setInsightError(null)}
        />
      )}

      {insight && (
        <SurfaceCard className="border-[rgba(245,215,142,0.35)] bg-[#171821] p-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium tracking-wide uppercase text-[#D4AF70]">
                Gemini Assessment Coach · Priority Gap: {insight.priorityGap}
              </p>
            </div>
            <h3 className="font-display text-lg font-semibold text-[#F7F3EA]">
              {insight.headline}
            </h3>
            <p className="text-sm leading-relaxed text-[#AAA6A0]">
              {insight.diagnosticSummary}
            </p>
            {insight.recommendedDrills.length > 0 && (
              <div className="border-t border-[rgba(212,175,112,0.14)] pt-3">
                <p className="mb-2 text-xs font-medium text-[#F5D78E]">
                  Recommended Empirical Drills
                </p>
                <ul className="space-y-1.5 text-sm text-[#F7F3EA]">
                  {insight.recommendedDrills.map((drill, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="font-mono-tabular text-xs text-[#D4AF70]">
                        0{idx + 1}.
                      </span>
                      <span>{drill}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </SurfaceCard>
      )}

      {/* Radar & Trend Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <SurfaceCard className="p-6 lg:col-span-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold text-[#F7F3EA]">
              Competency Geometry
            </h3>
            <span className="font-mono-tabular text-sm font-semibold text-[#F5D78E]">
              {readiness}% Ready
            </span>
          </div>
          <SkillRadarChart
            studentScores={draftScores}
            targetScores={career.requiredSkills}
          />
        </SurfaceCard>

        <SurfaceCard className="p-6 lg:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold text-[#F7F3EA]">
                Historical Assessment Trajectory
              </h3>
              <p className="text-xs text-[#AAA6A0]">
                Composite diagnostic scores recorded over time
              </p>
            </div>
            <span className="font-mono-tabular text-xs text-[#AAA6A0]">
              {assessments.length} snapshot{assessments.length === 1 ? '' : 's'}
            </span>
          </div>
          <AssessmentTrendChart records={assessments} />
        </SurfaceCard>
      </div>

      {/* Strengths & Improvement Areas */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <SurfaceCard className="p-6 lg:col-span-6">
          <h3 className="font-display text-base font-semibold text-[#F7F3EA]">
            Verified Strengths
          </h3>
          <p className="mt-1 text-xs text-[#AAA6A0]">
            Pillars meeting or exceeding {career.title} target thresholds
          </p>
          <div className="mt-5 space-y-4">
            {strengths.length === 0 ? (
              <p className="text-sm text-[#7D7973]">
                No pillars currently exceed the target threshold—prioritize the focus areas adjacent to bridge your first benchmark.
              </p>
            ) : (
              strengths.map((item) => (
                <div key={item.categoryId} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#F7F3EA]">{item.label}</span>
                    <span className="font-mono-tabular text-[#D4AF70]">
                      {item.current}% / {item.target}% target (+{item.delta})
                    </span>
                  </div>
                  <ProgressBar value={item.current} showValue={false} />
                </div>
              ))
            )}
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-6 lg:col-span-6">
          <h3 className="font-display text-base font-semibold text-[#F7F3EA]">
            Priority Improvement Areas
          </h3>
          <p className="mt-1 text-xs text-[#AAA6A0]">
            Ordered by gap magnitude relative to target role benchmarks
          </p>
          <div className="mt-5 space-y-4">
            {improvements.length === 0 ? (
              <p className="text-sm text-[#D4AF70]">
                All six pillars currently meet target role thresholds.
              </p>
            ) : (
              improvements.map((item) => (
                <div key={item.categoryId} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#F7F3EA]">{item.label}</span>
                    <span className="font-mono-tabular text-[#AAA6A0]">
                      {item.current}% / {item.target}% target ({item.delta} pts)
                    </span>
                  </div>
                  <ProgressBar value={item.current} showValue={false} />
                </div>
              ))
            )}
          </div>
        </SurfaceCard>
      </div>

      {/* Interactive Diagnostic Calibration */}
      <SurfaceCard className="p-6">
        <div className="flex flex-col justify-between gap-4 border-b border-[rgba(212,175,112,0.14)] pb-5 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-display text-base font-semibold text-[#F7F3EA]">
              Diagnostic Self-Evaluation &amp; Snapshot Recording
            </h3>
            <p className="text-xs text-[#AAA6A0]">
              Adjust proficiency levels after completing coursework or project evaluations, then save a new historical snapshot.
            </p>
          </div>
          <Button size="md" loading={saving} onClick={handleSaveSnapshot}>
            Save Diagnostic Snapshot
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          {SKILL_CATEGORIES.map((cat) => {
            const val = draftScores[cat.id] ?? 0;
            const target = career.requiredSkills[cat.id] ?? 75;
            return (
              <div key={cat.id} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor={`skill-slider-${cat.id}`}
                    className="text-sm font-medium text-[#F7F3EA]"
                  >
                    {cat.label}
                  </label>
                  <span className="font-mono-tabular text-xs text-[#F5D78E]">
                    {val}% <span className="text-[#7D7973]">(Target {target}%)</span>
                  </span>
                </div>
                <input
                  id={`skill-slider-${cat.id}`}
                  type="range"
                  min={0}
                  max={100}
                  value={val}
                  onChange={(e) => handleSliderChange(cat.id, Number(e.target.value))}
                  className="h-2 w-full cursor-pointer accent-[#D4AF70]"
                />
                <p className="text-xs text-[#7D7973]">{cat.description}</p>
              </div>
            );
          })}
        </div>
      </SurfaceCard>
    </div>
  );
}
