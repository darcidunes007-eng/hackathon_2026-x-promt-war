import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Clock, Sparkles, XCircle } from 'lucide-react';
import { buildDemoFallbackQuestions } from '../../data/academicDemoData';
import { auth } from '../../lib/firebase';
import type {
  AcademicAssessmentResult,
  AcademicChapter,
  AcademicDifficulty,
  AcademicQuestion,
  AcademicQuestionType,
  AcademicSubject,
  StudyMaterialItem,
} from '../../types/skillpath';
import {
  gradeAcademicAssessment,
  type SubjectiveEvaluationOverride,
  type SubmittedAnswerInput,
} from '../../utils/academicAnalytics';
import { postJson } from '../../utils/apiClient';
import { Button, SurfaceCard, ToastBanner } from '../ui/DesignSystem';

const QUESTION_TYPE_OPTIONS: Array<{ id: AcademicQuestionType; label: string }> = [
  { id: 'mcq', label: 'Multiple Choice (MCQ)' },
  { id: 'multiple_select', label: 'Multiple Select' },
  { id: 'numerical', label: 'Numerical' },
  { id: 'short_answer', label: 'Short Answer' },
  { id: 'long_answer', label: 'Long Answer' },
  { id: 'conceptual', label: 'Conceptual' },
];

const DIFFICULTIES: AcademicDifficulty[] = ['Beginner', 'Intermediate', 'Advanced', 'Exam'];

interface AssessmentCentreViewProps {
  mode: 'assessments' | 'practice';
  uid: string;
  isDemo: boolean;
  subjects: AcademicSubject[];
  chapters: AcademicChapter[];
  materials: StudyMaterialItem[];
  assessmentsHistory: AcademicAssessmentResult[];
  defaultSubjectId?: string | null;
  defaultChapterId?: string | null;
  onCompleteAssessment: (
    result: Omit<AcademicAssessmentResult, 'id' | 'uid' | 'createdAtLabel'>
  ) => Promise<AcademicAssessmentResult>;
  onOpenWeaknessAnalysis: () => void;
}

export function AssessmentCentreView({
  mode,
  uid,
  isDemo,
  subjects,
  chapters,
  materials,
  assessmentsHistory,
  defaultSubjectId,
  defaultChapterId,
  onCompleteAssessment,
  onOpenWeaknessAnalysis,
}: AssessmentCentreViewProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    defaultSubjectId || subjects[0]?.id || ''
  );
  const [selectedChapterId, setSelectedChapterId] = useState<string>(defaultChapterId || '');
  const [testScope, setTestScope] = useState<'chapter_test' | 'subject_test'>(
    defaultChapterId ? 'chapter_test' : 'subject_test'
  );
  const [difficulty, setDifficulty] = useState<AcademicDifficulty>('Intermediate');
  const [questionCount, setQuestionCount] = useState<number>(4);
  const [selectedTypes, setSelectedTypes] = useState<AcademicQuestionType[]>([
    'mcq',
    'multiple_select',
    'short_answer',
  ]);
  const [timedMinutes, setTimedMinutes] = useState<number>(10);

  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  // Active exam runner state
  const [activeQuestions, setActiveQuestions] = useState<AcademicQuestion[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, SubmittedAnswerInput>>({});
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [startedAtMs, setStartedAtMs] = useState<number>(0);
  const [completedResult, setCompletedResult] = useState<AcademicAssessmentResult | null>(null);
  const [showIncorrectOnly, setShowIncorrectOnly] = useState(false);

  const autoSubmitRef = useRef<() => void>(() => {});

  const effectiveSubjectId = selectedSubjectId || subjects[0]?.id || '';
  const activeSubject = subjects.find((s) => s.id === effectiveSubjectId) ?? null;

  const subjectChapters = useMemo(
    () =>
      chapters
        .filter((c) => c.subjectId === effectiveSubjectId)
        .sort((a, b) => a.orderIndex - b.orderIndex),
    [chapters, effectiveSubjectId]
  );

  const activeChapter = subjectChapters.find((c) => c.id === selectedChapterId);

  const toggleQuestionType = (qt: AcademicQuestionType) => {
    setSelectedTypes((prev) => {
      if (prev.includes(qt)) {
        return prev.length > 1 ? prev.filter((t) => t !== qt) : prev;
      }
      return [...prev, qt];
    });
  };

  // Timer countdown when running a Timed Practice Test
  useEffect(() => {
    if (mode !== 'practice' || !activeQuestions || completedResult) return;
    if (secondsRemaining <= 0) return;

    const timer = window.setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          setTimeout(() => autoSubmitRef.current(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [mode, activeQuestions, completedResult, secondsRemaining]);

  const beginRunWithQuestions = (questions: AcademicQuestion[], noticeText: string) => {
    setActiveQuestions(questions);
    setAnswers({});
    setCompletedResult(null);
    setShowIncorrectOnly(false);
    setStartedAtMs(Date.now());
    setSecondsRemaining(mode === 'practice' ? Math.max(1, timedMinutes) * 60 : 0);
    setAiNotice(noticeText);
  };

  const handleGenerateAssessment = async (useDemoSample = false) => {
    if (!activeSubject) {
      setErrorMsg('Select or create a subject before starting an assessment.');
      return;
    }

    setErrorMsg(null);
    setCompletedResult(null);

    if (useDemoSample && isDemo) {
      const sample = buildDemoFallbackQuestions(
        activeSubject,
        activeChapter?.title || activeSubject.name,
        questionCount
      );
      beginRunWithQuestions(
        sample,
        'Loaded labeled Demo sample questions (no AI call required).'
      );
      return;
    }

    setGenerating(true);
    try {
      const headers: Record<string, string> = {};
      if (!isDemo && auth.currentUser) {
        headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
      }

      const relevantExcerpt = materials
        .filter((m) => m.subjectId === activeSubject.id)
        .map((m) => m.content)
        .join('\n')
        .slice(0, 2500);

      const topics =
        activeChapter && activeChapter.topics.length > 0
          ? activeChapter.topics
          : subjectChapters.flatMap((c) => c.topics).slice(0, 6);

      const resp = await postJson<{ questions: AcademicQuestion[]; aiNotice: string }>(
        '/api/ai/assessment-generate',
        {
          mode: isDemo ? 'demo' : 'live',
          subjectName: activeSubject.name,
          subjectCategory: activeSubject.category,
          chapterTitle: activeChapter?.title,
          topics,
          difficulty,
          questionCount,
          questionTypes: selectedTypes,
          sourceMaterialExcerpt: relevantExcerpt || undefined,
        },
        headers,
        'Unable to generate AI assessment questions.'
      );

      beginRunWithQuestions(resp.questions, resp.aiNotice);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to generate assessment questions.'
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmitAssessment = async () => {
    if (!activeSubject || !activeQuestions || submitting) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const subjectiveTypes = new Set<AcademicQuestionType>([
        'short_answer',
        'long_answer',
        'conceptual',
      ]);

      const subjectiveItems = activeQuestions
        .filter((q) => subjectiveTypes.has(q.type))
        .map((q) => ({
          questionId: q.id,
          prompt: q.prompt,
          referenceAnswer: q.referenceAnswer,
          keyPoints: q.keyPoints,
          studentAnswer: (answers[q.id]?.textAnswer ?? '').trim(),
        }))
        .filter((item) => item.studentAnswer.length > 0);

      const overrides: Record<string, SubjectiveEvaluationOverride> = {};
      if (subjectiveItems.length > 0) {
        try {
          const headers: Record<string, string> = {};
          if (!isDemo && auth.currentUser) {
            headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
          }

          const evalResp = await postJson<{
            evaluations: Array<{
              questionId: string;
              scoreRatio: number;
              feedback: string;
              needsHumanReview: boolean;
            }>;
          }>(
            '/api/ai/assessment-evaluate',
            {
              mode: isDemo ? 'demo' : 'live',
              subjectName: activeSubject.name,
              items: subjectiveItems,
            },
            headers
          );

          for (const item of evalResp.evaluations ?? []) {
            overrides[item.questionId] = item;
          }
        } catch {
          // Deterministic rubric fallback inside gradeAcademicAssessment handles un-evaluated responses transparently
        }
      }

      const elapsedMin = Math.max(
        1,
        Math.round((Date.now() - (startedAtMs || Date.now())) / 60000)
      );

      const gradedDraft = gradeAcademicAssessment({
        id: `pending-${Date.now()}`,
        uid,
        subject: activeSubject,
        chapter: activeChapter,
        mode: mode === 'practice' ? 'timed_practice' : testScope,
        difficulty,
        durationMinutes: elapsedMin,
        questions: activeQuestions,
        answers,
        subjectiveOverrides: overrides,
      });

      const saved = await onCompleteAssessment({
        subjectId: gradedDraft.subjectId,
        subjectName: gradedDraft.subjectName,
        chapterId: gradedDraft.chapterId,
        chapterTitle: gradedDraft.chapterTitle,
        linkedSkillId: gradedDraft.linkedSkillId,
        mode: gradedDraft.mode,
        difficulty: gradedDraft.difficulty,
        totalQuestions: gradedDraft.totalQuestions,
        correctCount: gradedDraft.correctCount,
        scorePercent: gradedDraft.scorePercent,
        durationMinutes: gradedDraft.durationMinutes,
        requiresHumanReview: gradedDraft.requiresHumanReview,
        weakTopics: gradedDraft.weakTopics,
        reviews: gradedDraft.reviews,
      });

      setCompletedResult(saved);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to submit and grade assessment.');
    } finally {
      setSubmitting(false);
    }
  };

  autoSubmitRef.current = () => {
    void handleSubmitAssessment();
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const visibleReviews = useMemo(() => {
    if (!completedResult) return [];
    return showIncorrectOnly
      ? completedResult.reviews.filter((r) => !r.isCorrect)
      : completedResult.reviews;
  }, [completedResult, showIncorrectOnly]);

  return (
    <div className="space-y-6">
      {errorMsg && (
        <ToastBanner tone="error" message={errorMsg} onDismiss={() => setErrorMsg(null)} />
      )}

      {/* Configuration Panel */}
      {!activeQuestions && (
        <SurfaceCard className="p-6 space-y-5">
          <div className="border-b border-[rgba(212,175,112,0.14)] pb-4">
            <p className="text-xs font-medium tracking-[0.12em] uppercase text-[#D4AF70]">
              {mode === 'practice' ? 'Timed Exam Simulation' : 'Diagnostic Academic Assessments'}
            </p>
            <h3 className="font-display text-lg font-semibold text-[#F7F3EA]">
              {mode === 'practice'
                ? 'Configure Timed Practice Test'
                : 'Generate Chapter or Subject Assessment'}
            </h3>
            <p className="text-xs text-[#AAA6A0]">
              Completed scores update your Subject Progress, Weakness Analysis, and mapped Skill Analysis pillars automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <label htmlFor="assess-subject" className="block text-xs font-medium text-[#AAA6A0]">
                Subject
              </label>
              <select
                id="assess-subject"
                value={effectiveSubjectId}
                onChange={(e) => {
                  setSelectedSubjectId(e.target.value);
                  setSelectedChapterId('');
                }}
                className="h-11 w-full rounded-lg border border-[rgba(212,175,112,0.2)] bg-[#11121A] px-3 text-sm text-[#F7F3EA] focus:border-[#D4AF70] focus:outline-none"
              >
                {subjects.length === 0 ? (
                  <option value="">No subjects available</option>
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
              <label htmlFor="assess-chapter" className="block text-xs font-medium text-[#AAA6A0]">
                Chapter Scope
              </label>
              <select
                id="assess-chapter"
                value={selectedChapterId}
                onChange={(e) => {
                  const cid = e.target.value;
                  setSelectedChapterId(cid);
                  setTestScope(cid ? 'chapter_test' : 'subject_test');
                }}
                className="h-11 w-full rounded-lg border border-[rgba(212,175,112,0.2)] bg-[#11121A] px-3 text-sm text-[#F7F3EA] focus:border-[#D4AF70] focus:outline-none"
              >
                <option value="">Full Subject Test</option>
                {subjectChapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    Ch {c.orderIndex}: {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="assess-diff" className="block text-xs font-medium text-[#AAA6A0]">
                Difficulty
              </label>
              <select
                id="assess-diff"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as AcademicDifficulty)}
                className="h-11 w-full rounded-lg border border-[rgba(212,175,112,0.2)] bg-[#11121A] px-3 text-sm text-[#F7F3EA] focus:border-[#D4AF70] focus:outline-none"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="assess-count" className="block text-xs font-medium text-[#AAA6A0]">
                  Questions
                </label>
                <select
                  id="assess-count"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="h-11 w-full rounded-lg border border-[rgba(212,175,112,0.2)] bg-[#11121A] px-3 text-sm text-[#F7F3EA] focus:border-[#D4AF70] focus:outline-none"
                >
                  {[3, 4, 5, 6, 8].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              {mode === 'practice' && (
                <div className="space-y-1.5">
                  <label htmlFor="assess-timer" className="block text-xs font-medium text-[#AAA6A0]">
                    Timer (Min)
                  </label>
                  <select
                    id="assess-timer"
                    value={timedMinutes}
                    onChange={(e) => setTimedMinutes(Number(e.target.value))}
                    className="h-11 w-full rounded-lg border border-[rgba(212,175,112,0.2)] bg-[#11121A] px-3 text-sm text-[#F7F3EA] focus:border-[#D4AF70] focus:outline-none"
                  >
                    {[5, 10, 15, 25, 40].map((m) => (
                      <option key={m} value={m}>
                        {m}m
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-[#AAA6A0]">Included Question Formats</p>
            <div className="flex flex-wrap gap-2">
              {QUESTION_TYPE_OPTIONS.map((opt) => {
                const selected = selectedTypes.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleQuestionType(opt.id)}
                    aria-pressed={selected}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                      selected
                        ? 'border-[#D4AF70] bg-[#20212B] text-[#F5D78E]'
                        : 'border-[rgba(212,175,112,0.16)] bg-[#11121A] text-[#AAA6A0] hover:text-[#F7F3EA]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
            {isDemo && (
              <Button
                variant="secondary"
                disabled={!activeSubject || generating}
                onClick={() => void handleGenerateAssessment(true)}
              >
                Load Demo Sample Quiz
              </Button>
            )}
            <Button
              loading={generating}
              disabled={!activeSubject}
              onClick={() => void handleGenerateAssessment(false)}
            >
              <Sparkles className="h-4 w-4" />
              {generating
                ? 'Generating Questions...'
                : mode === 'practice'
                  ? 'Start Timed AI Practice Test'
                  : 'Generate AI Assessment'}
            </Button>
          </div>
        </SurfaceCard>
      )}

      {/* Active Assessment Runner */}
      {activeQuestions && !completedResult && (
        <SurfaceCard className="p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(212,175,112,0.14)] pb-4">
            <div>
              <p className="text-xs font-medium text-[#D4AF70]">
                {activeSubject?.name}
                {activeChapter ? ` · ${activeChapter.title}` : ''} · {difficulty}
              </p>
              <h3 className="font-display text-lg font-semibold text-[#F7F3EA]">
                {mode === 'practice' ? 'Timed Practice Session' : 'Active Assessment'} (
                {activeQuestions.length} Questions)
              </h3>
              {aiNotice && <p className="mt-1 text-xs text-[#7D7973]">{aiNotice}</p>}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {mode === 'practice' && (
                <div className="flex items-center gap-1.5 rounded-lg border border-[rgba(245,215,142,0.35)] bg-[#11121A] px-3 py-1.5 font-mono-tabular text-sm font-semibold text-[#F5D78E]">
                  <Clock className="h-4 w-4 text-[#D4AF70]" />
                  <span>{formatTimer(secondsRemaining)}</span>
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={() => setActiveQuestions(null)}>
                Cancel
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            {activeQuestions.map((q, idx) => {
              const current = answers[q.id] ?? {};
              return (
                <div
                  key={q.id}
                  className="rounded-xl border border-[rgba(212,175,112,0.16)] bg-[#11121A] p-5 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#7D7973]">
                    <span className="font-mono-tabular text-[#D4AF70]">
                      Question 0{idx + 1} · {q.type.replace('_', ' ').toUpperCase()}
                    </span>
                    <span>
                      Topic: {q.topic} · {q.difficulty}
                    </span>
                  </div>

                  <p className="text-sm font-medium leading-relaxed text-[#F7F3EA]">{q.prompt}</p>

                  {q.type === 'mcq' && q.options && (
                    <div className="space-y-2 pt-1">
                      {q.options.map((opt, optIdx) => {
                        const checked = current.selectedIndex === optIdx;
                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() =>
                              setAnswers((prev) => ({
                                ...prev,
                                [q.id]: { ...prev[q.id], selectedIndex: optIdx },
                              }))
                            }
                            className={`flex w-full items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left text-sm transition-colors ${
                              checked
                                ? 'border-[#D4AF70] bg-[#20212B] text-[#F5D78E]'
                                : 'border-[rgba(212,175,112,0.14)] bg-[#171821] text-[#AAA6A0] hover:text-[#F7F3EA]'
                            }`}
                          >
                            <span className="font-mono-tabular text-xs">
                              {String.fromCharCode(65 + optIdx)}.
                            </span>
                            <span>{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {q.type === 'multiple_select' && q.options && (
                    <div className="space-y-2 pt-1">
                      <p className="text-xs text-[#7D7973]">Select all statements that apply:</p>
                      {q.options.map((opt, optIdx) => {
                        const existing = current.selectedIndices ?? [];
                        const checked = existing.includes(optIdx);
                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => {
                              const next = checked
                                ? existing.filter((i) => i !== optIdx)
                                : [...existing, optIdx];
                              setAnswers((prev) => ({
                                ...prev,
                                [q.id]: { ...prev[q.id], selectedIndices: next },
                              }));
                            }}
                            className={`flex w-full items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left text-sm transition-colors ${
                              checked
                                ? 'border-[#D4AF70] bg-[#20212B] text-[#F5D78E]'
                                : 'border-[rgba(212,175,112,0.14)] bg-[#171821] text-[#AAA6A0] hover:text-[#F7F3EA]'
                            }`}
                          >
                            <span className="font-mono-tabular text-xs">
                              {checked ? '[✓]' : '[ ]'}
                            </span>
                            <span>{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {q.type === 'numerical' && (
                    <input
                      type="number"
                      step="any"
                      aria-label={`Numerical answer for question ${idx + 1}`}
                      placeholder="Enter numerical value..."
                      value={current.numericalAnswer ?? ''}
                      onChange={(e) =>
                        setAnswers((prev) => ({
                          ...prev,
                          [q.id]: { ...prev[q.id], numericalAnswer: e.target.value },
                        }))
                      }
                      className="h-11 w-full max-w-xs rounded-lg border border-[rgba(212,175,112,0.2)] bg-[#171821] px-3.5 text-sm text-[#F7F3EA] placeholder:text-[#6F6B66] focus:border-[#D4AF70] focus:outline-none"
                    />
                  )}

                  {(q.type === 'short_answer' ||
                    q.type === 'long_answer' ||
                    q.type === 'conceptual') && (
                    <textarea
                      rows={q.type === 'long_answer' ? 4 : 3}
                      aria-label={`Written answer for question ${idx + 1}`}
                      placeholder="Explain your reasoning clearly, including assumptions or steps..."
                      value={current.textAnswer ?? ''}
                      onChange={(e) =>
                        setAnswers((prev) => ({
                          ...prev,
                          [q.id]: { ...prev[q.id], textAnswer: e.target.value },
                        }))
                      }
                      className="w-full rounded-lg border border-[rgba(212,175,112,0.2)] bg-[#171821] px-3.5 py-2.5 text-sm text-[#F7F3EA] placeholder:text-[#6F6B66] focus:border-[#D4AF70] focus:outline-none"
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-[rgba(212,175,112,0.14)] pt-4">
            <Button variant="ghost" onClick={() => setActiveQuestions(null)}>
              Discard
            </Button>
            <Button loading={submitting} onClick={() => void handleSubmitAssessment()}>
              {submitting ? 'Grading & Syncing Skill Analysis...' : 'Submit Assessment'}
            </Button>
          </div>
        </SurfaceCard>
      )}

      {/* Completed Result Breakdown */}
      {completedResult && (
        <SurfaceCard className="p-6 space-y-6 border-[rgba(245,215,142,0.35)]">
          <div className="flex flex-col justify-between gap-4 border-b border-[rgba(212,175,112,0.14)] pb-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-[#D4AF70]">
                Assessment Completed · Skill Analysis Updated
              </p>
              <h3 className="font-display text-2xl font-bold text-[#F7F3EA]">
                {completedResult.scorePercent}% Score ({completedResult.correctCount}/
                {completedResult.totalQuestions} Verified)
              </h3>
              <p className="text-xs text-[#AAA6A0]">
                {completedResult.subjectName}
                {completedResult.chapterTitle ? ` · ${completedResult.chapterTitle}` : ''} ·{' '}
                {completedResult.durationMinutes} min
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={onOpenWeaknessAnalysis}>
                Inspect Weakness Analysis
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setActiveQuestions(null);
                  setCompletedResult(null);
                }}
              >
                New Assessment
              </Button>
            </div>
          </div>

          {completedResult.requiresHumanReview && (
            <div className="rounded-lg border border-[rgba(212,175,112,0.28)] bg-[#11121A] p-3.5 text-xs text-[#AAA6A0]">
              <strong className="text-[#F5D78E]">AI-Assisted Subjective Evaluation Notice:</strong>{' '}
              Written responses were provisionally evaluated against rubric concepts. Confirm open-ended answers with your instructor or the AI Study Assistant for formal grading.
            </div>
          )}

          {completedResult.weakTopics.length > 0 && (
            <div className="text-xs text-[#AAA6A0]">
              <span className="font-semibold text-[#F5D78E]">Weak Concepts Flagged: </span>
              {completedResult.weakTopics.join(' · ')}
            </div>
          )}

          <div className="flex items-center justify-between">
            <h4 className="font-display text-sm font-semibold text-[#F7F3EA]">
              Question-by-Question Review
            </h4>
            <button
              type="button"
              onClick={() => setShowIncorrectOnly((prev) => !prev)}
              className="text-xs font-medium text-[#D4AF70] hover:text-[#F5D78E]"
            >
              {showIncorrectOnly ? 'Show All Questions' : 'Show Incorrect Only'}
            </button>
          </div>

          <div className="space-y-3">
            {visibleReviews.map((rev, i) => (
              <div
                key={`${rev.questionId}-${i}`}
                className="rounded-lg border border-[rgba(212,175,112,0.14)] bg-[#11121A] p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-[#F7F3EA]">{rev.prompt}</p>
                  <span className="inline-flex items-center gap-1 text-xs font-medium shrink-0">
                    {rev.isCorrect ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-[#5CB88A]" />
                        <span className="text-[#D2EAD9]">Correct</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-[#E57373]" />
                        <span className="text-[#F5C2C4]">Needs Review</span>
                      </>
                    )}
                  </span>
                </div>
                <p className="text-xs text-[#AAA6A0]">
                  <strong className="text-[#F7F3EA]">Your answer:</strong> {rev.userAnswerLabel}
                </p>
                <p className="text-xs text-[#AAA6A0]">
                  <strong className="text-[#F5D78E]">Expected benchmark:</strong>{' '}
                  {rev.expectedAnswerLabel}
                </p>
                <p className="text-xs text-[#7D7973]">{rev.feedback}</p>
                <p className="text-xs text-[#AAA6A0]">
                  <strong className="text-[#D4AF70]">Explanation:</strong> {rev.explanation}
                </p>
              </div>
            ))}
          </div>
        </SurfaceCard>
      )}

      {/* Historical Assessments List */}
      <SurfaceCard className="p-6 space-y-4">
        <div>
          <h3 className="font-display text-base font-semibold text-[#F7F3EA]">
            Recent Academic Evaluations
          </h3>
          <p className="text-xs text-[#AAA6A0]">
            {assessmentsHistory.length} completed assessment{assessmentsHistory.length === 1 ? '' : 's'}
          </p>
        </div>

        {assessmentsHistory.length === 0 ? (
          <p className="rounded-lg border border-[rgba(212,175,112,0.12)] bg-[#11121A] p-4 text-xs text-[#AAA6A0]">
            No academic assessments completed yet. Generate an assessment above to begin tracking real accuracy and updating your Skill Analysis.
          </p>
        ) : (
          <div className="divide-y divide-[rgba(212,175,112,0.12)]">
            {assessmentsHistory
              .slice()
              .reverse()
              .slice(0, 8)
              .map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-1 last:pb-1"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-display text-sm font-semibold text-[#F7F3EA]">
                      {item.subjectName}
                      {item.chapterTitle ? ` · ${item.chapterTitle}` : ''}
                    </p>
                    <p className="text-xs text-[#AAA6A0]">
                      {item.mode.replace('_', ' ')} · {item.difficulty} · {item.correctCount}/
                      {item.totalQuestions} correct · {item.createdAtLabel}
                    </p>
                  </div>
                  <span className="font-mono-tabular text-sm font-semibold text-[#F5D78E]">
                    {item.scorePercent}%
                  </span>
                </div>
              ))}
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}
