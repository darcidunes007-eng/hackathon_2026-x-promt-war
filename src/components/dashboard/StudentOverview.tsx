import React, { useState } from 'react';
import { ArrowRight, Check, GraduationCap, Plus } from 'lucide-react';
import { CAREER_PATHWAYS } from '../../data/curriculum';
import type {
  ActivityEntry,
  DashboardTab,
  LearningGoal,
  StudentProfile,
} from '../../types/skillpath';
import {
  calculateAverageSkillScore,
  calculateOverallReadiness,
  calculateRoadmapProgress,
  calculateSkillGaps,
  getCareerById,
} from '../../utils/skillAnalytics';
import { Button, ProgressBar, SurfaceCard, TextInput } from '../ui/DesignSystem';
import { SkillRadarChart } from '../ui/SkillCharts';

interface StudentOverviewProps {
  profile: StudentProfile;
  activity: ActivityEntry[];
  academicSummary?: {
    subjectsCount: number;
    assessmentsCount: number;
    overallAccuracy: number | null;
    weakSubjectName?: string;
  };
  onNavigate: (tab: DashboardTab) => void;
  onUpdateGoals: (goals: LearningGoal[]) => Promise<void>;
}

export function StudentOverview({
  profile,
  activity,
  academicSummary,
  onNavigate,
  onUpdateGoals,
}: StudentOverviewProps) {
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState('Systems');
  const [savingGoal, setSavingGoal] = useState(false);

  const career = getCareerById(profile.selectedCareerId);
  const readiness = calculateOverallReadiness(profile.skillScores, career);
  const avgSkill = calculateAverageSkillScore(profile.skillScores);
  const roadmap = calculateRoadmapProgress(profile.completedMilestones, career);
  const gaps = calculateSkillGaps(profile.skillScores, career);
  const topFocusGap = gaps[0];
  const firstName = profile.displayName.split(' ')[0] || 'Scholar';

  const recommendedCareers = CAREER_PATHWAYS.map((pathway) => ({
    pathway,
    fitScore: calculateOverallReadiness(profile.skillScores, pathway),
  }))
    .sort((a, b) => b.fitScore - a.fitScore)
    .slice(0, 3);

  const handleToggleGoal = async (goalId: string) => {
    const next = profile.learningGoals.map((g) =>
      g.id === goalId ? { ...g, completed: !g.completed } : g
    );
    await onUpdateGoals(next);
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newGoalTitle.trim();
    if (title.length < 3) return;
    setSavingGoal(true);
    try {
      const next: LearningGoal[] = [
        {
          id: `goal-${Date.now()}`,
          title: title.slice(0, 140),
          dueDate: 'Upcoming',
          completed: false,
          category: newGoalCategory,
        },
        ...profile.learningGoals,
      ].slice(0, 15);
      await onUpdateGoals(next);
      setNewGoalTitle('');
    } finally {
      setSavingGoal(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome & Primary Context */}
      <section className="flex flex-col justify-between gap-4 border-b border-[rgba(212,175,112,0.14)] pb-6 sm:flex-row sm:items-end">
        <div className="space-y-1.5">
          <p className="text-xs font-medium tracking-[0.12em] uppercase text-[#D4AF70]">
            {profile.academicTrack} · Class of {profile.graduationYear}
          </p>
          <h2 className="font-display text-2xl font-bold tracking-tight text-[#F7F3EA] sm:text-3xl">
            Welcome back, {firstName}.
          </h2>
          <p className="text-sm text-[#AAA6A0]">
            Target pathway: <span className="text-[#F7F3EA] font-medium">{career.title}</span>
            {topFocusGap && topFocusGap.delta < 0
              ? ` · Highest-leverage focus area: ${topFocusGap.label} (${topFocusGap.delta} pts)`
              : ' · All competency thresholds currently met'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Button size="sm" variant="secondary" onClick={() => onNavigate('skills')}>
            Run Skill Diagnostic
          </Button>
          <Button size="sm" onClick={() => onNavigate('roadmap')}>
            Continue Roadmap
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </section>

      {/* 4-Metric KPI Strip */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SurfaceCard className="p-5">
          <p className="text-xs text-[#AAA6A0]">Career Readiness</p>
          <p className="mt-2 font-mono-tabular text-3xl font-semibold text-[#F5D78E]">
            {readiness}%
          </p>
          <p className="mt-1 text-xs text-[#7D7973]">Calibrated to {career.title}</p>
        </SurfaceCard>

        <SurfaceCard className="p-5">
          <p className="text-xs text-[#AAA6A0]">Roadmap Progress</p>
          <p className="mt-2 font-mono-tabular text-3xl font-semibold text-[#F7F3EA]">
            {roadmap.percentage}%
          </p>
          <p className="mt-1 text-xs text-[#7D7973] tabular-nums">
            {roadmap.completedCount} of {roadmap.totalCount} milestones completed
          </p>
        </SurfaceCard>

        <SurfaceCard className="p-5">
          <p className="text-xs text-[#AAA6A0]">Composite Skill Mean</p>
          <p className="mt-2 font-mono-tabular text-3xl font-semibold text-[#F7F3EA]">
            {avgSkill}
            <span className="text-base text-[#7D7973]">/100</span>
          </p>
          <p className="mt-1 text-xs text-[#7D7973]">Across 6 academic &amp; technical pillars</p>
        </SurfaceCard>

        <SurfaceCard className="p-5">
          <p className="text-xs text-[#AAA6A0]">Weekly Study Cadence</p>
          <p className="mt-2 font-mono-tabular text-3xl font-semibold text-[#F7F3EA]">
            {profile.weeklyStudyHours}h
          </p>
          <p className="mt-1 text-xs text-[#7D7973]">Dedicated weekly focus budget</p>
        </SurfaceCard>
      </section>

      {academicSummary && (
        <SurfaceCard className="p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[rgba(212,175,112,0.28)] bg-[#11121A] text-[#D4AF70]">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <h3 className="font-display text-sm font-semibold text-[#F7F3EA]">
                  Academic Learning Centre
                </h3>
                <p className="text-xs text-[#AAA6A0]">
                  {academicSummary.subjectsCount} active subject
                  {academicSummary.subjectsCount === 1 ? '' : 's'} ·{' '}
                  {academicSummary.assessmentsCount} academic assessment
                  {academicSummary.assessmentsCount === 1 ? '' : 's'}
                  {academicSummary.overallAccuracy !== null
                    ? ` · ${academicSummary.overallAccuracy}% mean accuracy`
                    : ''}
                  {academicSummary.weakSubjectName
                    ? ` · Focus needed: ${academicSummary.weakSubjectName}`
                    : ''}
                </p>
              </div>
            </div>

            <Button size="sm" variant="secondary" onClick={() => onNavigate('academic')}>
              Open Academic Learning
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </SurfaceCard>
      )}

      {/* Skill Development Summary & Career Recommendations */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <SurfaceCard className="p-6 lg:col-span-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-base font-semibold text-[#F7F3EA]">
                Skill Development Summary
              </h3>
              <p className="text-xs text-[#AAA6A0]">
                Current proficiency overlaid on {career.title} requirements
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('skills')}
              className="text-xs font-medium text-[#D4AF70] hover:text-[#F5D78E]"
            >
              Full Analysis
            </button>
          </div>
          <SkillRadarChart
            studentScores={profile.skillScores}
            targetScores={career.requiredSkills}
          />
        </SurfaceCard>

        <SurfaceCard className="flex flex-col justify-between p-6 lg:col-span-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-base font-semibold text-[#F7F3EA]">
                  Career Recommendations
                </h3>
                <p className="text-xs text-[#AAA6A0]">
                  Ranked by alignment with your current skill profile
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('careers')}
                className="text-xs font-medium text-[#D4AF70] hover:text-[#F5D78E]"
              >
                Explore All
              </button>
            </div>

            <div className="divide-y divide-[rgba(212,175,112,0.12)]">
              {recommendedCareers.map(({ pathway, fitScore }) => {
                const isSelected = pathway.id === career.id;
                return (
                  <div
                    key={pathway.id}
                    className="flex items-center justify-between gap-4 py-3.5 first:pt-1 last:pb-1"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="truncate font-display text-sm font-semibold text-[#F7F3EA]">
                        {pathway.title}
                        {isSelected && (
                          <span className="ml-2 text-xs font-normal text-[#D4AF70]">
                            · Active
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-[#AAA6A0]">
                        {pathway.domain} · {pathway.compensationRange}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono-tabular text-sm font-semibold text-[#F5D78E]">
                        {fitScore}% match
                      </p>
                      <p className="text-[11px] text-[#7D7973]">{pathway.demandOutlook}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Roadmap Stage Progress */}
          <div className="mt-6 space-y-3 border-t border-[rgba(212,175,112,0.14)] pt-5">
            <div className="flex items-center justify-between">
              <p className="font-display text-sm font-semibold text-[#F7F3EA]">
                Active Roadmap Stages
              </p>
              <button
                type="button"
                onClick={() => onNavigate('roadmap')}
                className="text-xs font-medium text-[#D4AF70] hover:text-[#F5D78E]"
              >
                Open Roadmap
              </button>
            </div>
            <div className="space-y-3">
              {roadmap.stages.map((stage) => (
                <ProgressBar
                  key={stage.stageNumber}
                  label={`Stage 0${stage.stageNumber}: ${stage.title}`}
                  value={stage.percentage}
                />
              ))}
            </div>
          </div>
        </SurfaceCard>
      </section>

      {/* Upcoming Learning Goals & Recent Activity */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <SurfaceCard className="p-6 lg:col-span-6">
          <div className="mb-4 space-y-1">
            <h3 className="font-display text-base font-semibold text-[#F7F3EA]">
              Upcoming Learning Goals
            </h3>
            <p className="text-xs text-[#AAA6A0]">
              Track short-term deliverables aligned with your active roadmap
            </p>
          </div>

          <form onSubmit={handleAddGoal} className="mb-5 flex flex-col gap-2 sm:flex-row">
            <div className="flex-1">
              <TextInput
                label="Add Learning Goal"
                placeholder="e.g., Implement consensus log compaction test"
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <select
                aria-label="Goal category"
                value={newGoalCategory}
                onChange={(e) => setNewGoalCategory(e.target.value)}
                className="h-11 rounded-lg border border-[rgba(212,175,112,0.2)] bg-[#11121A] px-3 text-xs text-[#F7F3EA] focus:border-[#D4AF70] focus:outline-none"
              >
                <option value="Systems">Systems</option>
                <option value="Applied ML">Applied ML</option>
                <option value="Algorithms">Algorithms</option>
                <option value="Research">Research</option>
              </select>
              <Button type="submit" size="md" loading={savingGoal} aria-label="Add learning goal">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
          </form>

          {profile.learningGoals.length === 0 ? (
            <p className="rounded-lg border border-[rgba(212,175,112,0.12)] bg-[#11121A] p-4 text-xs text-[#AAA6A0]">
              No active learning goals yet. Add your next study objective above.
            </p>
          ) : (
            <ul className="divide-y divide-[rgba(212,175,112,0.12)]">
              {profile.learningGoals.map((goal) => (
                <li key={goal.id} className="flex items-start gap-3 py-3">
                  <button
                    type="button"
                    onClick={() => handleToggleGoal(goal.id)}
                    aria-label={`Mark "${goal.title}" as ${
                      goal.completed ? 'incomplete' : 'complete'
                    }`}
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                      goal.completed
                        ? 'border-[#D4AF70] bg-[#D4AF70] text-[#090A0F]'
                        : 'border-[rgba(212,175,112,0.35)] bg-[#11121A] text-transparent hover:border-[#F5D78E]'
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm ${
                        goal.completed ? 'line-through text-[#7D7973]' : 'text-[#F7F3EA]'
                      }`}
                    >
                      {goal.title}
                    </p>
                    <p className="mt-0.5 text-xs text-[#7D7973]">
                      {goal.category} · Due {goal.dueDate}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SurfaceCard>

        <SurfaceCard className="p-6 lg:col-span-6">
          <div className="mb-4 space-y-1">
            <h3 className="font-display text-base font-semibold text-[#F7F3EA]">
              Recent Activity
            </h3>
            <p className="text-xs text-[#AAA6A0]">
              Chronological record of assessments, milestones, and mentor sessions
            </p>
          </div>

          {activity.length === 0 ? (
            <p className="rounded-lg border border-[rgba(212,175,112,0.12)] bg-[#11121A] p-4 text-xs text-[#AAA6A0]">
              Your recent milestones, diagnostic evaluations, and mentor consultations will appear here.
            </p>
          ) : (
            <ul className="divide-y divide-[rgba(212,175,112,0.12)]">
              {activity.slice(0, 6).map((entry) => (
                <li key={entry.id} className="py-3.5 first:pt-1 last:pb-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-medium text-[#F7F3EA]">{entry.title}</p>
                      <p className="text-xs text-[#AAA6A0]">{entry.detail}</p>
                    </div>
                    <span className="shrink-0 font-mono-tabular text-[11px] text-[#7D7973]">
                      {entry.createdAtLabel}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SurfaceCard>
      </section>
    </div>
  );
}
