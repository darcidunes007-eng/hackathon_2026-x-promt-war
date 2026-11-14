import React, { useMemo, useState } from 'react';
import { Calendar, Check, Plus, Trash2 } from 'lucide-react';
import { SKILL_CATEGORIES } from '../../data/curriculum';
import type {
  AcademicAssessmentResult,
  AcademicChapter,
  AcademicSubject,
  StudyPlannerSession,
} from '../../types/skillpath';
import type { AcademicWeaknessSummary } from '../../utils/academicAnalytics';
import { Button, ProgressBar, SurfaceCard, TextInput, ToastBanner } from '../ui/DesignSystem';

interface AcademicPerformanceProps {
  subjects: AcademicSubject[];
  chapters: AcademicChapter[];
  assessments: AcademicAssessmentResult[];
  insights: AcademicWeaknessSummary;
}

export function AcademicPerformancePanel({
  subjects,
  chapters,
  assessments,
  insights,
}: AcademicPerformanceProps) {
  const subjectRows = useMemo(() => {
    return subjects.map((subj) => {
      const subjCh = chapters.filter((c) => c.subjectId === subj.id);
      const doneCh = subjCh.filter((c) => c.completed).length;
      const subjAssess = assessments.filter((a) => a.subjectId === subj.id);
      const avg =
        subjAssess.length === 0
          ? null
          : Math.round(subjAssess.reduce((acc, a) => acc + a.scorePercent, 0) / subjAssess.length);
      return {
        id: subj.id,
        name: subj.name,
        category: subj.category,
        chapterPct: subjCh.length === 0 ? 0 : Math.round((doneCh / subjCh.length) * 100),
        avgScore: avg,
        attempts: subjAssess.length,
      };
    });
  }, [subjects, chapters, assessments]);

  const trendPoints = assessments.slice(-8);

  return (
    <div className="space-y-6">
      {/* KPI Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SurfaceCard className="p-5">
          <p className="text-xs text-[#AAA6A0]">Overall Assessment Accuracy</p>
          <p className="mt-2 font-mono-tabular text-3xl font-semibold text-[#F5D78E]">
            {insights.overallAccuracy !== null ? `${insights.overallAccuracy}%` : '—'}
          </p>
          <p className="mt-1 text-xs text-[#7D7973]">
            Across {assessments.length} completed assessment{assessments.length === 1 ? '' : 's'}
          </p>
        </SurfaceCard>

        <SurfaceCard className="p-5">
          <p className="text-xs text-[#AAA6A0]">Strong Subjects (≥75%)</p>
          <p className="mt-2 font-mono-tabular text-3xl font-semibold text-[#F7F3EA]">
            {insights.strongSubjects.length}
          </p>
          <p className="mt-1 text-xs text-[#7D7973]">Meeting target mastery</p>
        </SurfaceCard>

        <SurfaceCard className="p-5">
          <p className="text-xs text-[#AAA6A0]">Needs Focus (&lt;75%)</p>
          <p className="mt-2 font-mono-tabular text-3xl font-semibold text-[#F7F3EA]">
            {insights.weakSubjects.length}
          </p>
          <p className="mt-1 text-xs text-[#7D7973]">Subjects prioritized for review</p>
        </SurfaceCard>

        <SurfaceCard className="p-5">
          <p className="text-xs text-[#AAA6A0]">Study Plan Consistency</p>
          <p className="mt-2 font-mono-tabular text-3xl font-semibold text-[#F7F3EA]">
            {insights.studyConsistencyPercent}%
          </p>
          <p className="mt-1 text-xs text-[#7D7973]">Scheduled planner completion</p>
        </SurfaceCard>
      </div>

      {/* Subject Accuracy & Chapter Completion Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <SurfaceCard className="p-6 lg:col-span-7 space-y-4">
          <div>
            <h3 className="font-display text-base font-semibold text-[#F7F3EA]">
              Subject-Wise Assessment Accuracy &amp; Syllabus Completion
            </h3>
            <p className="text-xs text-[#AAA6A0]">
              Computed strictly from your saved academic assessments and chapter completions
            </p>
          </div>

          {subjectRows.length === 0 ? (
            <p className="text-xs text-[#7D7973]">
              Add academic subjects and complete assessments to populate subject-level charts.
            </p>
          ) : (
            <div className="space-y-4">
              {subjectRows.map((row) => (
                <div key={row.id} className="space-y-2 rounded-lg border border-[rgba(212,175,112,0.12)] bg-[#11121A] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-display text-sm font-semibold text-[#F7F3EA]">
                      {row.name}
                    </p>
                    <p className="font-mono-tabular text-xs text-[#F5D78E]">
                      {row.avgScore !== null ? `${row.avgScore}% accuracy` : 'Unassessed'} ·{' '}
                      {row.attempts} test{row.attempts === 1 ? '' : 's'}
                    </p>
                  </div>
                  <ProgressBar
                    label="Assessment Accuracy"
                    value={row.avgScore ?? 0}
                  />
                  <ProgressBar
                    label="Chapter Completion"
                    value={row.chapterPct}
                  />
                </div>
              ))}
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard className="p-6 lg:col-span-5 space-y-5">
          <div>
            <h3 className="font-display text-base font-semibold text-[#F7F3EA]">
              Assessment Accuracy Trajectory
            </h3>
            <p className="text-xs text-[#AAA6A0]">Score progression across recent quizzes &amp; tests</p>
          </div>

          {trendPoints.length === 0 ? (
            <p className="rounded-lg border border-[rgba(212,175,112,0.12)] bg-[#11121A] p-4 text-xs text-[#7D7973]">
              Complete your first chapter or subject assessment to visualize score trends.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex h-40 items-end gap-2 rounded-lg border border-[rgba(212,175,112,0.14)] bg-[#11121A] px-4 pt-6 pb-3">
                {trendPoints.map((pt, idx) => (
                  <div key={pt.id || idx} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="font-mono-tabular text-[11px] text-[#F5D78E]">
                      {pt.scorePercent}%
                    </span>
                    <div className="flex h-24 w-full items-end rounded bg-[#20212B]">
                      <div
                        className="w-full rounded bg-gradient-to-t from-[#A88A59] to-[#F5D78E]"
                        style={{ height: `${Math.max(8, pt.scorePercent)}%` }}
                      />
                    </div>
                    <span className="max-w-full truncate text-[10px] text-[#7D7973]">
                      #{idx + 1}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 border-t border-[rgba(212,175,112,0.14)] pt-4">
                <h4 className="font-display text-xs font-semibold uppercase tracking-wide text-[#D4AF70]">
                  Accuracy by Difficulty Tier
                </h4>
                {insights.difficultyBreakdown.map((d) => (
                  <div key={d.difficulty} className="flex items-center justify-between text-xs">
                    <span className="text-[#AAA6A0]">
                      {d.difficulty} ({d.attempts} q)
                    </span>
                    <span className="font-mono-tabular text-[#F7F3EA]">
                      {d.accuracyPercent !== null ? `${d.accuracyPercent}%` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SurfaceCard>
      </div>
    </div>
  );
}

interface WeaknessAnalysisPanelProps {
  subjects: AcademicSubject[];
  insights: AcademicWeaknessSummary;
  onGenerateRemediationNotes: (subjectId: string, topic?: string) => void;
  onStartTargetedPractice: (subjectId: string, chapterId?: string) => void;
  onAskAssistant: (subjectId: string, topic?: string) => void;
  onScheduleRevision: (subjectId: string, topic?: string) => void;
}

export function WeaknessAnalysisPanel({
  subjects,
  insights,
  onGenerateRemediationNotes,
  onStartTargetedPractice,
  onAskAssistant,
  onScheduleRevision,
}: WeaknessAnalysisPanelProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <SurfaceCard className="p-6 lg:col-span-6 space-y-4">
          <div>
            <h3 className="font-display text-base font-semibold text-[#F7F3EA]">
              Strong vs. Weak Subject Classification
            </h3>
            <p className="text-xs text-[#AAA6A0]">
              Directly synchronized with your Skill Analysis competency pillars
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#D4AF70]">
                Priority Weak Subjects (&lt;75%)
              </p>
              {insights.weakSubjects.length === 0 ? (
                <p className="text-xs text-[#7D7973]">
                  No weak subjects flagged yet based on recorded assessment data.
                </p>
              ) : (
                insights.weakSubjects.map((s) => {
                  const skillName =
                    SKILL_CATEGORIES.find((k) => k.id === s.linkedSkillId)?.label ?? s.linkedSkillId;
                  return (
                    <div
                      key={s.subjectId}
                      className="rounded-lg border border-[rgba(212,175,112,0.2)] bg-[#11121A] p-3.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-display text-sm font-semibold text-[#F7F3EA]">
                          {s.subjectName}
                        </p>
                        <span className="font-mono-tabular text-xs text-[#F5C2C4]">
                          {s.averageAccuracy}% avg
                        </span>
                      </div>
                      <p className="text-xs text-[#AAA6A0]">
                        Impacts Skill Pillar: {skillName}
                        {s.weakTopics.length > 0 ? ` · Missed topics: ${s.weakTopics.join(', ')}` : ''}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            <div className="space-y-2 border-t border-[rgba(212,175,112,0.14)] pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#5CB88A]">
                Strong Subjects (≥75%)
              </p>
              {insights.strongSubjects.length === 0 ? (
                <p className="text-xs text-[#7D7973]">
                  Score 75% or above on a subject assessment to establish verified strengths.
                </p>
              ) : (
                insights.strongSubjects.map((s) => (
                  <div
                    key={s.subjectId}
                    className="flex items-center justify-between rounded-lg border border-[rgba(212,175,112,0.14)] bg-[#11121A] px-3.5 py-2.5"
                  >
                    <span className="text-sm text-[#F7F3EA]">{s.subjectName}</span>
                    <span className="font-mono-tabular text-xs text-[#D2EAD9]">
                      {s.averageAccuracy}% avg
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-6 lg:col-span-6 space-y-4">
          <div>
            <h3 className="font-display text-base font-semibold text-[#F7F3EA]">
              Difficult Chapters &amp; Frequently Missed Concepts
            </h3>
            <p className="text-xs text-[#AAA6A0]">
              Granular topic-level breakdown extracted from incorrect quiz responses
            </p>
          </div>

          {insights.difficultChapters.length === 0 &&
          insights.frequentlyIncorrectConcepts.length === 0 ? (
            <p className="rounded-lg border border-[rgba(212,175,112,0.12)] bg-[#11121A] p-4 text-xs text-[#7D7973]">
              No recurring weak chapters or missed concepts detected yet. Complete assessments to diagnose topic-level friction.
            </p>
          ) : (
            <div className="space-y-4">
              {insights.difficultChapters.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#F5D78E]">
                    Difficult Chapters
                  </p>
                  {insights.difficultChapters.map((ch) => (
                    <div
                      key={ch.chapterId}
                      className="flex items-center justify-between rounded-lg border border-[rgba(212,175,112,0.14)] bg-[#11121A] px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#F7F3EA]">
                          {ch.chapterTitle}
                        </p>
                        <p className="text-xs text-[#7D7973]">{ch.subjectName}</p>
                      </div>
                      <span className="font-mono-tabular text-xs text-[#F5D78E] shrink-0">
                        {ch.averageAccuracy}%
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {insights.frequentlyIncorrectConcepts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#D4AF70]">
                    Frequently Missed Concepts
                  </p>
                  {insights.frequentlyIncorrectConcepts.map((c, idx) => (
                    <div
                      key={`${c.subjectName}-${c.topic}-${idx}`}
                      className="flex items-center justify-between rounded-lg border border-[rgba(212,175,112,0.14)] bg-[#11121A] px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-[#F7F3EA]">{c.topic}</p>
                        <p className="text-xs text-[#7D7973]">{c.subjectName}</p>
                      </div>
                      <span className="font-mono-tabular text-xs text-[#F5C2C4] shrink-0">
                        {c.missCount} miss{c.missCount === 1 ? '' : 'es'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </SurfaceCard>
      </div>

      {/* Adaptive Learning Recommendations */}
      <SurfaceCard className="p-6 space-y-4">
        <div>
          <h3 className="font-display text-base font-semibold text-[#F7F3EA]">
            Adaptive Learning Recommendations
          </h3>
          <p className="text-xs text-[#AAA6A0]">
            Targeted next actions generated from your subject accuracy and chapter performance
          </p>
        </div>

        {insights.recommendedActions.length === 0 ? (
          <p className="text-xs text-[#7D7973]">
            {subjects.length === 0
              ? 'Create a subject and complete an assessment to unlock adaptive recommendations.'
              : 'All assessed topics currently meet mastery targets.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {insights.recommendedActions.map((rec) => (
              <div
                key={rec.id}
                className="flex flex-col justify-between rounded-lg border border-[rgba(212,175,112,0.18)] bg-[#11121A] p-4 space-y-3"
              >
                <div className="space-y-1">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[#D4AF70]">
                    {rec.subjectName}
                  </p>
                  <h4 className="font-display text-sm font-semibold text-[#F7F3EA]">{rec.title}</h4>
                  <p className="text-xs text-[#AAA6A0]">{rec.rationale}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onGenerateRemediationNotes(rec.subjectId, rec.targetTopic)}
                  >
                    Simplify Notes
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onStartTargetedPractice(rec.subjectId, rec.targetChapterId)}
                  >
                    Practice Quiz
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onAskAssistant(rec.subjectId, rec.targetTopic)}
                  >
                    Ask Assistant
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onScheduleRevision(rec.subjectId, rec.targetTopic)}
                  >
                    Add Revision
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}

interface StudyPlannerPanelProps {
  subjects: AcademicSubject[];
  chapters: AcademicChapter[];
  sessions: StudyPlannerSession[];
  insights: AcademicWeaknessSummary;
  onCreateSession: (input: Omit<StudyPlannerSession, 'id' | 'uid'>) => Promise<string>;
  onToggleSession: (sessionId: string, completed: boolean) => Promise<void>;
  onDeleteSession: (sessionId: string) => Promise<void>;
}

export function StudyPlannerPanel({
  subjects,
  chapters,
  sessions,
  insights,
  onCreateSession,
  onToggleSession,
  onDeleteSession,
}: StudyPlannerPanelProps) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const [subjectId, setSubjectId] = useState<string>(subjects[0]?.id || '');
  const [chapterId, setChapterId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [sessionType, setSessionType] = useState<'study' | 'revision' | 'exam_prep' | 'practice'>(
    'revision'
  );
  const [scheduledDate, setScheduledDate] = useState(todayIso);
  const [durationMinutes, setDurationMinutes] = useState('45');
  const [filterView, setFilterView] = useState<'all' | 'today' | 'upcoming' | 'revisions' | 'completed'>(
    'all'
  );
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  const effectiveSubjectId = subjectId || subjects[0]?.id || '';
  const activeSubject = subjects.find((s) => s.id === effectiveSubjectId) ?? null;
  const subjectChapters = chapters.filter((c) => c.subjectId === effectiveSubjectId);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (filterView === 'today') return s.scheduledDate === todayIso && !s.completed;
      if (filterView === 'upcoming') return s.scheduledDate > todayIso && !s.completed;
      if (filterView === 'revisions') return s.sessionType === 'revision' && !s.completed;
      if (filterView === 'completed') return s.completed;
      return true;
    });
  }, [sessions, filterView, todayIso]);

  const totalSessions = sessions.length;
  const completedCount = sessions.filter((s) => s.completed).length;
  const weeklyPct = totalSessions === 0 ? 0 : Math.round((completedCount / totalSessions) * 100);

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubject) {
      setNotice({ tone: 'error', message: 'Add a subject first before scheduling sessions.' });
      return;
    }
    const cleanTitle = title.trim();
    if (cleanTitle.length < 3) {
      setNotice({ tone: 'error', message: 'Enter a session title of at least 3 characters.' });
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      const ch = subjectChapters.find((c) => c.id === chapterId);
      const isWeakSubject = insights.weakSubjects.some((w) => w.subjectId === activeSubject.id);
      await onCreateSession({
        subjectId: activeSubject.id,
        subjectName: activeSubject.name,
        chapterId: ch?.id,
        chapterTitle: ch?.title,
        title: cleanTitle,
        sessionType,
        scheduledDate: scheduledDate || todayIso,
        durationMinutes: Math.max(10, Math.min(360, Number(durationMinutes) || 45)),
        completed: false,
        priority: isWeakSubject ? 'recommended' : 'standard',
      });
      setTitle('');
      setNotice({ tone: 'success', message: 'Scheduled study session.' });
    } catch (err) {
      setNotice({
        tone: 'error',
        message: err instanceof Error ? err.message : 'Unable to save study session.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleQuickWeakRevision = async (weakSubjectId: string, weakSubjectName: string, topic?: string) => {
    setSaving(true);
    try {
      await onCreateSession({
        subjectId: weakSubjectId,
        subjectName: weakSubjectName,
        title: topic
          ? `Targeted revision: ${topic} (${weakSubjectName})`
          : `Priority weakness review: ${weakSubjectName}`,
        sessionType: 'revision',
        scheduledDate: todayIso,
        durationMinutes: 45,
        completed: false,
        priority: 'recommended',
      });
      setNotice({
        tone: 'success',
        message: `Added Skill-Analysis-recommended revision for ${weakSubjectName}.`,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {notice && (
        <ToastBanner
          tone={notice.tone}
          message={notice.message}
          onDismiss={() => setNotice(null)}
        />
      )}

      {/* Skill-Analysis-Guided Recommendations */}
      {insights.weakSubjects.length > 0 && (
        <SurfaceCard className="p-5 space-y-3 border-[rgba(245,215,142,0.28)]">
          <p className="text-xs font-medium uppercase tracking-wider text-[#D4AF70]">
            Recommended Study Allocation · Guided by Skill Analysis
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {insights.weakSubjects.slice(0, 2).map((w) => (
              <div
                key={w.subjectId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[rgba(212,175,112,0.16)] bg-[#11121A] p-3.5"
              >
                <div className="min-w-0">
                  <p className="font-display text-sm font-semibold text-[#F7F3EA]">
                    {w.subjectName} ({w.averageAccuracy}%)
                  </p>
                  <p className="text-xs text-[#AAA6A0]">
                    {w.weakTopics[0]
                      ? `Focus on: ${w.weakTopics[0]}`
                      : 'Allocate +45m targeted revision'}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={saving}
                  onClick={() =>
                    void handleQuickWeakRevision(w.subjectId, w.subjectName, w.weakTopics[0])
                  }
                >
                  Schedule 45m Today
                </Button>
              </div>
            ))}
          </div>
        </SurfaceCard>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Schedule Form */}
        <SurfaceCard className="p-6 lg:col-span-5 space-y-4">
          <div className="space-y-1">
            <h3 className="font-display text-base font-semibold text-[#F7F3EA]">
              Schedule Study or Revision Session
            </h3>
            <p className="text-xs text-[#AAA6A0]">
              Plan exam prep, chapter study blocks, and spaced revisions
            </p>
          </div>

          <form onSubmit={handleAddSession} className="space-y-3.5">
            <div className="space-y-1.5">
              <label htmlFor="plan-subject" className="block text-xs font-medium text-[#AAA6A0]">
                Subject
              </label>
              <select
                id="plan-subject"
                value={effectiveSubjectId}
                onChange={(e) => {
                  setSubjectId(e.target.value);
                  setChapterId('');
                }}
                className="h-11 w-full rounded-lg border border-[rgba(212,175,112,0.2)] bg-[#11121A] px-3 text-sm text-[#F7F3EA] focus:border-[#D4AF70] focus:outline-none"
              >
                {subjects.length === 0 ? (
                  <option value="">No subjects added</option>
                ) : (
                  subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="plan-chapter" className="block text-xs font-medium text-[#AAA6A0]">
                Chapter (Optional)
              </label>
              <select
                id="plan-chapter"
                value={chapterId}
                onChange={(e) => setChapterId(e.target.value)}
                className="h-11 w-full rounded-lg border border-[rgba(212,175,112,0.2)] bg-[#11121A] px-3 text-sm text-[#F7F3EA] focus:border-[#D4AF70] focus:outline-none"
              >
                <option value="">General Subject</option>
                {subjectChapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    Ch {c.orderIndex}: {c.title}
                  </option>
                ))}
              </select>
            </div>

            <TextInput
              label="Session Goal"
              placeholder="e.g., Practice 12 electric flux problems"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label htmlFor="plan-type" className="block text-xs font-medium text-[#AAA6A0]">
                  Type
                </label>
                <select
                  id="plan-type"
                  value={sessionType}
                  onChange={(e) =>
                    setSessionType(
                      e.target.value as 'study' | 'revision' | 'exam_prep' | 'practice'
                    )
                  }
                  className="h-11 w-full rounded-lg border border-[rgba(212,175,112,0.2)] bg-[#11121A] px-2.5 text-xs text-[#F7F3EA] focus:border-[#D4AF70] focus:outline-none"
                >
                  <option value="study">Study</option>
                  <option value="revision">Revision</option>
                  <option value="practice">Practice Test</option>
                  <option value="exam_prep">Exam Prep</option>
                </select>
              </div>
              <TextInput
                label="Date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
              <TextInput
                label="Minutes"
                type="number"
                min={10}
                max={360}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
              />
            </div>

            <Button type="submit" loading={saving} disabled={!activeSubject} className="w-full">
              <Plus className="h-4 w-4" />
              Add to Study Plan
            </Button>
          </form>
        </SurfaceCard>

        {/* Session List */}
        <SurfaceCard className="p-6 lg:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-semibold text-[#F7F3EA]">
                Study Schedule &amp; Revisions
              </h3>
              <p className="text-xs text-[#AAA6A0]">
                {completedCount} of {totalSessions} planned sessions completed ({weeklyPct}%)
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'today', label: 'Today' },
                  { id: 'upcoming', label: 'Upcoming' },
                  { id: 'revisions', label: 'Revisions' },
                  { id: 'completed', label: 'Completed' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterView(tab.id)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                    filterView === tab.id
                      ? 'border-[#D4AF70] bg-[#20212B] text-[#F5D78E]'
                      : 'border-[rgba(212,175,112,0.14)] bg-[#11121A] text-[#AAA6A0] hover:text-[#F7F3EA]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <ProgressBar value={weeklyPct} label="Planner completion rate" />

          {filteredSessions.length === 0 ? (
            <div className="rounded-lg border border-[rgba(212,175,112,0.12)] bg-[#11121A] p-5 text-center space-y-2">
              <Calendar className="mx-auto h-6 w-6 text-[#7D7973]" />
              <p className="text-xs text-[#AAA6A0]">
                No study sessions match this filter.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[rgba(212,175,112,0.12)]">
              {filteredSessions.map((sess) => (
                <div key={sess.id} className="flex items-start justify-between gap-3 py-3.5 first:pt-1 last:pb-1">
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => void onToggleSession(sess.id, !sess.completed)}
                      aria-label={`Mark "${sess.title}" as ${
                        sess.completed ? 'incomplete' : 'completed'
                      }`}
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                        sess.completed
                          ? 'border-[#D4AF70] bg-[#D4AF70] text-[#090A0F]'
                          : 'border-[rgba(212,175,112,0.35)] bg-[#11121A] text-transparent hover:border-[#F5D78E]'
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <div className="min-w-0 space-y-0.5">
                      <p
                        className={`text-sm font-medium ${
                          sess.completed ? 'text-[#7D7973] line-through' : 'text-[#F7F3EA]'
                        }`}
                      >
                        {sess.title}
                      </p>
                      <p className="text-xs text-[#AAA6A0]">
                        {sess.subjectName} · {sess.sessionType.replace('_', ' ')} · {sess.scheduledDate} ·{' '}
                        {sess.durationMinutes}m
                        {sess.priority === 'recommended' ? ' · Recommended Priority' : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void onDeleteSession(sess.id)}
                    aria-label={`Delete session ${sess.title}`}
                    className="rounded p-1.5 text-[#7D7973] hover:bg-[#2A1519] hover:text-[#F5B8B8] shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </SurfaceCard>
      </div>
    </div>
  );
}
