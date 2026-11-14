import type {
  AcademicAssessmentResult,
  AcademicChapter,
  AcademicDifficulty,
  AcademicQuestion,
  AcademicQuestionResponseReview,
  AcademicSubject,
  AcademicSubjectCategory,
  SkillCategoryId,
  StudyMaterialItem,
  StudyPlannerSession,
} from '../types/skillpath';

export interface SubjectPerformanceSummary {
  subjectId: string;
  subjectName: string;
  category: AcademicSubjectCategory;
  linkedSkillId: SkillCategoryId;
  assessmentsCount: number;
  averageAccuracy: number | null;
  latestAccuracy: number | null;
  completedChapters: number;
  totalChapters: number;
  chapterCompletionPercent: number;
  classification: 'Strong' | 'Developing' | 'Weak' | 'Unassessed';
  weakTopics: string[];
}

export interface ChapterAccuracySummary {
  chapterId: string;
  subjectId: string;
  subjectName: string;
  chapterTitle: string;
  completed: boolean;
  attempts: number;
  averageAccuracy: number | null;
}

export interface DifficultyAccuracySummary {
  difficulty: AcademicDifficulty;
  attempts: number;
  accuracyPercent: number | null;
}

export interface AcademicWeaknessSummary {
  strongSubjects: SubjectPerformanceSummary[];
  weakSubjects: SubjectPerformanceSummary[];
  difficultChapters: ChapterAccuracySummary[];
  frequentlyIncorrectConcepts: Array<{ topic: string; missCount: number; subjectName: string }>;
  difficultyBreakdown: DifficultyAccuracySummary[];
  overallAccuracy: number | null;
  studyConsistencyPercent: number;
  recommendedActions: Array<{
    id: string;
    subjectId: string;
    subjectName: string;
    title: string;
    rationale: string;
    actionType: 'review_notes' | 'practice_test' | 'ask_assistant' | 'schedule_revision';
    targetTopic?: string;
    targetChapterId?: string;
  }>;
}

const DEFAULT_SKILL_BY_CATEGORY: Record<AcademicSubjectCategory, SkillCategoryId> = {
  Mathematics: 'quantitative_literacy',
  Physics: 'quantitative_literacy',
  Chemistry: 'quantitative_literacy',
  'Computer Science': 'systems_architecture',
  Programming: 'fullstack_engineering',
  'Artificial Intelligence': 'applied_ml',
  'Data Science': 'applied_ml',
  English: 'technical_communication',
  Other: 'algorithmic_reasoning',
};

export function suggestSkillForCategory(category: AcademicSubjectCategory): SkillCategoryId {
  return DEFAULT_SKILL_BY_CATEGORY[category] ?? 'algorithmic_reasoning';
}

export interface SubmittedAnswerInput {
  selectedIndex?: number;
  selectedIndices?: number[];
  textAnswer?: string;
  numericalAnswer?: string;
}

export interface SubjectiveEvaluationOverride {
  questionId: string;
  scoreRatio: number;
  feedback: string;
  needsHumanReview?: boolean;
}

export function gradeObjectiveQuestion(
  question: AcademicQuestion,
  answer: SubmittedAnswerInput | undefined,
  subjectiveOverride?: SubjectiveEvaluationOverride
): AcademicQuestionResponseReview {
  if (question.type === 'mcq') {
    const selected = answer?.selectedIndex;
    const expected = question.correctOptionIndex ?? 0;
    const hasSelected = typeof selected === 'number' && selected >= 0;
    const isCorrect = hasSelected && selected === expected;
    const userLabel =
      hasSelected && question.options?.[selected]
        ? question.options[selected]
        : 'No option selected';
    const expectedLabel = question.options?.[expected] ?? 'Option unavailable';

    return {
      questionId: question.id,
      prompt: question.prompt,
      type: question.type,
      topic: question.topic,
      difficulty: question.difficulty,
      userAnswerLabel: userLabel,
      expectedAnswerLabel: expectedLabel,
      isCorrect,
      needsHumanReview: false,
      scoreRatio: isCorrect ? 1 : 0,
      feedback: isCorrect ? 'Correct choice verified.' : 'Selected option does not match the verified answer.',
      explanation: question.explanation,
    };
  }

  if (question.type === 'multiple_select') {
    const selectedSet = new Set(Array.isArray(answer?.selectedIndices) ? answer.selectedIndices : []);
    const expectedSet = new Set(Array.isArray(question.correctOptionIndices) ? question.correctOptionIndices : []);
    const exactMatch =
      expectedSet.size > 0 &&
      selectedSet.size === expectedSet.size &&
      Array.from(expectedSet).every((idx) => selectedSet.has(idx));

    const userLabel =
      selectedSet.size > 0
        ? Array.from(selectedSet)
            .sort((a, b) => a - b)
            .map((idx) => question.options?.[idx] ?? `#${idx + 1}`)
            .join('; ')
        : 'No options selected';
    const expectedLabel =
      expectedSet.size > 0
        ? Array.from(expectedSet)
            .sort((a, b) => a - b)
            .map((idx) => question.options?.[idx] ?? `#${idx + 1}`)
            .join('; ')
        : 'No key configured';

    return {
      questionId: question.id,
      prompt: question.prompt,
      type: question.type,
      topic: question.topic,
      difficulty: question.difficulty,
      userAnswerLabel: userLabel,
      expectedAnswerLabel: expectedLabel,
      isCorrect: exactMatch,
      needsHumanReview: false,
      scoreRatio: exactMatch ? 1 : 0,
      feedback: exactMatch
        ? 'All required options selected accurately.'
        : 'Multiple-select choices require an exact match across all valid statements.',
      explanation: question.explanation,
    };
  }

  if (question.type === 'numerical') {
    const raw = (answer?.numericalAnswer ?? '').trim();
    const numeric = Number(raw);
    const expected = question.correctNumericalAnswer ?? 0;
    const tol = Math.max(0.0001, question.numericalTolerance ?? 0.05);
    const isFiniteInput = raw.length > 0 && Number.isFinite(numeric);
    const isCorrect = isFiniteInput && Math.abs(numeric - expected) <= tol;

    return {
      questionId: question.id,
      prompt: question.prompt,
      type: question.type,
      topic: question.topic,
      difficulty: question.difficulty,
      userAnswerLabel: raw.length > 0 ? raw : 'No numerical value submitted',
      expectedAnswerLabel: `${expected} (±${tol})`,
      isCorrect,
      needsHumanReview: false,
      scoreRatio: isCorrect ? 1 : 0,
      feedback: isCorrect
        ? 'Numerical solution falls within accepted tolerance.'
        : 'Numerical answer falls outside accepted tolerance.',
      explanation: question.explanation,
    };
  }

  // Subjective types: short_answer, long_answer, conceptual
  const text = (answer?.textAnswer ?? '').trim();
  if (subjectiveOverride) {
    const boundedRatio = Math.max(0, Math.min(1, subjectiveOverride.scoreRatio));
    return {
      questionId: question.id,
      prompt: question.prompt,
      type: question.type,
      topic: question.topic,
      difficulty: question.difficulty,
      userAnswerLabel: text || 'No written response submitted',
      expectedAnswerLabel: question.referenceAnswer || 'Key rubric concepts',
      isCorrect: boundedRatio >= 0.7,
      needsHumanReview: subjectiveOverride.needsHumanReview ?? true,
      scoreRatio: boundedRatio,
      feedback: subjectiveOverride.feedback,
      explanation: question.explanation,
    };
  }

  // Deterministic keyword-coverage fallback ONLY when AI subjective review wasn't supplied,
  // explicitly flagged as tentative requiring human review.
  const keyPoints = (question.keyPoints ?? []).filter(Boolean);
  if (text.length === 0) {
    return {
      questionId: question.id,
      prompt: question.prompt,
      type: question.type,
      topic: question.topic,
      difficulty: question.difficulty,
      userAnswerLabel: 'No written response submitted',
      expectedAnswerLabel: question.referenceAnswer || keyPoints.join(', ') || 'Written explanation',
      isCorrect: false,
      needsHumanReview: true,
      scoreRatio: 0,
      feedback: 'No answer was entered for this written question.',
      explanation: question.explanation,
    };
  }

  const lower = text.toLowerCase();
  const matched = keyPoints.filter((kw) => lower.includes(kw.toLowerCase()));
  const ratio =
    keyPoints.length > 0 ? Math.min(1, matched.length / keyPoints.length) : text.length >= 25 ? 0.6 : 0.3;

  return {
    questionId: question.id,
    prompt: question.prompt,
    type: question.type,
    topic: question.topic,
    difficulty: question.difficulty,
    userAnswerLabel: text,
    expectedAnswerLabel: question.referenceAnswer || keyPoints.join('; ') || 'Conceptual rubric',
    isCorrect: ratio >= 0.65,
    needsHumanReview: true,
    scoreRatio: Number(ratio.toFixed(2)),
    feedback:
      'Tentative rubric check based on key-concept coverage. Subjective responses should be reviewed by an instructor or verified with the AI Study Assistant.',
    explanation: question.explanation,
  };
}

export function gradeAcademicAssessment(params: {
  id: string;
  uid: string;
  subject: AcademicSubject;
  chapter?: AcademicChapter;
  mode: 'chapter_test' | 'subject_test' | 'timed_practice';
  difficulty: AcademicDifficulty;
  durationMinutes: number;
  questions: AcademicQuestion[];
  answers: Record<string, SubmittedAnswerInput>;
  subjectiveOverrides?: Record<string, SubjectiveEvaluationOverride>;
  createdAtLabel?: string;
}): AcademicAssessmentResult {
  const reviews = params.questions.map((q) =>
    gradeObjectiveQuestion(q, params.answers[q.id], params.subjectiveOverrides?.[q.id])
  );

  const totalQuestions = Math.max(1, reviews.length);
  const scoreSum = reviews.reduce((acc, r) => acc + r.scoreRatio, 0);
  const correctCount = reviews.filter((r) => r.isCorrect).length;
  const scorePercent = Math.round((scoreSum / totalQuestions) * 100);
  const requiresHumanReview = reviews.some((r) => r.needsHumanReview);
  const weakTopics = Array.from(
    new Set(reviews.filter((r) => !r.isCorrect && r.topic).map((r) => r.topic))
  );

  return {
    id: params.id,
    uid: params.uid,
    subjectId: params.subject.id,
    subjectName: params.subject.name,
    chapterId: params.chapter?.id,
    chapterTitle: params.chapter?.title,
    linkedSkillId: params.subject.linkedSkillId,
    mode: params.mode,
    difficulty: params.difficulty,
    totalQuestions: reviews.length,
    correctCount,
    scorePercent,
    durationMinutes: params.durationMinutes,
    requiresHumanReview,
    weakTopics,
    reviews,
    createdAtLabel: params.createdAtLabel ?? 'Today',
  };
}

/**
 * Updates the student's Skill Analysis profile scores strictly from actual verified
 * academic assessment outcomes (weighted exponential moving integration so real
 * performance shifts the corresponding skill pillar transparently).
 */
export function computeUpdatedSkillScoresFromAssessment(
  currentSkillScores: Record<SkillCategoryId, number>,
  assessment: AcademicAssessmentResult,
  priorAssessmentsForSkill: AcademicAssessmentResult[]
): Record<SkillCategoryId, number> {
  const skillId = assessment.linkedSkillId;
  const currentBaseline = currentSkillScores[skillId] ?? 50;
  const allSkillResults = [...priorAssessmentsForSkill, assessment];
  const realMean =
    allSkillResults.reduce((acc, item) => acc + item.scorePercent, 0) / allSkillResults.length;

  // Blend verified assessment mean (60%) with prior calibrated score (40%) for stability
  const updatedValue = Math.max(
    0,
    Math.min(100, Math.round(realMean * 0.6 + currentBaseline * 0.4))
  );

  return {
    ...currentSkillScores,
    [skillId]: updatedValue,
  };
}

export function computeAcademicInsights(params: {
  subjects: AcademicSubject[];
  chapters: AcademicChapter[];
  assessments: AcademicAssessmentResult[];
  materials: StudyMaterialItem[];
  plannerSessions: StudyPlannerSession[];
}): AcademicWeaknessSummary {
  const subjectSummaries: SubjectPerformanceSummary[] = params.subjects.map((subj) => {
    const subjChapters = params.chapters.filter((c) => c.subjectId === subj.id);
    const completedChapters = subjChapters.filter((c) => c.completed).length;
    const totalChapters = subjChapters.length;
    const chapterCompletionPercent =
      totalChapters === 0 ? 0 : Math.round((completedChapters / totalChapters) * 100);

    const subjAssessments = params.assessments.filter((a) => a.subjectId === subj.id);
    const averageAccuracy =
      subjAssessments.length === 0
        ? null
        : Math.round(
            subjAssessments.reduce((acc, a) => acc + a.scorePercent, 0) / subjAssessments.length
          );
    const latestAccuracy =
      subjAssessments.length === 0 ? null : subjAssessments[subjAssessments.length - 1].scorePercent;

    let classification: SubjectPerformanceSummary['classification'] = 'Unassessed';
    if (averageAccuracy !== null) {
      if (averageAccuracy >= 78) classification = 'Strong';
      else if (averageAccuracy >= 62) classification = 'Developing';
      else classification = 'Weak';
    }

    const weakTopics = Array.from(
      new Set(subjAssessments.flatMap((a) => a.weakTopics))
    ).slice(0, 6);

    return {
      subjectId: subj.id,
      subjectName: subj.name,
      category: subj.category,
      linkedSkillId: subj.linkedSkillId,
      assessmentsCount: subjAssessments.length,
      averageAccuracy,
      latestAccuracy,
      completedChapters,
      totalChapters,
      chapterCompletionPercent,
      classification,
      weakTopics,
    };
  });

  const strongSubjects = subjectSummaries
    .filter((s) => s.averageAccuracy !== null && s.averageAccuracy >= 75)
    .sort((a, b) => (b.averageAccuracy ?? 0) - (a.averageAccuracy ?? 0));

  const weakSubjects = subjectSummaries
    .filter((s) => s.averageAccuracy !== null && s.averageAccuracy < 75)
    .sort((a, b) => (a.averageAccuracy ?? 100) - (b.averageAccuracy ?? 100));

  const chapterSummaries: ChapterAccuracySummary[] = params.chapters.map((ch) => {
    const subj = params.subjects.find((s) => s.id === ch.subjectId);
    const attempts = params.assessments.filter((a) => a.chapterId === ch.id);
    const avg =
      attempts.length === 0
        ? null
        : Math.round(attempts.reduce((acc, a) => acc + a.scorePercent, 0) / attempts.length);
    return {
      chapterId: ch.id,
      subjectId: ch.subjectId,
      subjectName: subj?.name ?? 'Subject',
      chapterTitle: ch.title,
      completed: ch.completed,
      attempts: attempts.length,
      averageAccuracy: avg,
    };
  });

  const difficultChapters = chapterSummaries
    .filter((c) => c.averageAccuracy !== null && c.averageAccuracy < 75)
    .sort((a, b) => (a.averageAccuracy ?? 100) - (b.averageAccuracy ?? 100));

  const conceptMap = new Map<string, { topic: string; missCount: number; subjectName: string }>();
  for (const assessment of params.assessments) {
    for (const review of assessment.reviews) {
      if (!review.isCorrect && review.topic) {
        const key = `${assessment.subjectName}::${review.topic}`;
        const existing = conceptMap.get(key);
        if (existing) {
          existing.missCount += 1;
        } else {
          conceptMap.set(key, {
            topic: review.topic,
            missCount: 1,
            subjectName: assessment.subjectName,
          });
        }
      }
    }
  }
  const frequentlyIncorrectConcepts = Array.from(conceptMap.values())
    .sort((a, b) => b.missCount - a.missCount)
    .slice(0, 8);

  const difficulties: AcademicDifficulty[] = ['Beginner', 'Intermediate', 'Advanced', 'Exam'];
  const difficultyBreakdown: DifficultyAccuracySummary[] = difficulties.map((diff) => {
    const matchingReviews = params.assessments.flatMap((a) =>
      a.reviews.filter((r) => r.difficulty === diff)
    );
    if (matchingReviews.length === 0) {
      return { difficulty: diff, attempts: 0, accuracyPercent: null };
    }
    const sum = matchingReviews.reduce((acc, r) => acc + r.scoreRatio, 0);
    return {
      difficulty: diff,
      attempts: matchingReviews.length,
      accuracyPercent: Math.round((sum / matchingReviews.length) * 100),
    };
  });

  const overallAccuracy =
    params.assessments.length === 0
      ? null
      : Math.round(
          params.assessments.reduce((acc, a) => acc + a.scorePercent, 0) / params.assessments.length
        );

  const totalPlanner = params.plannerSessions.length;
  const completedPlanner = params.plannerSessions.filter((s) => s.completed).length;
  const studyConsistencyPercent =
    totalPlanner === 0 ? 0 : Math.round((completedPlanner / totalPlanner) * 100);

  const recommendedActions: AcademicWeaknessSummary['recommendedActions'] = [];

  for (const weak of weakSubjects.slice(0, 3)) {
    const targetChapter = difficultChapters.find((c) => c.subjectId === weak.subjectId);
    const hasNotes = params.materials.some((m) => m.subjectId === weak.subjectId);
    recommendedActions.push({
      id: `rec-notes-${weak.subjectId}`,
      subjectId: weak.subjectId,
      subjectName: weak.subjectName,
      title: hasNotes
        ? `Review & Simplify ${weak.subjectName} Notes (${weak.averageAccuracy}% avg)`
        : `Generate Beginner Study Guide for ${weak.subjectName}`,
      rationale:
        weak.weakTopics.length > 0
          ? `Assessment data shows repeated gaps in ${weak.weakTopics.slice(0, 2).join(', ')}.`
          : `Average assessment accuracy (${weak.averageAccuracy}%) is below the 75% mastery benchmark.`,
      actionType: 'review_notes',
      targetTopic: weak.weakTopics[0],
      targetChapterId: targetChapter?.chapterId,
    });

    recommendedActions.push({
      id: `rec-practice-${weak.subjectId}`,
      subjectId: weak.subjectId,
      subjectName: weak.subjectName,
      title: `Take Targeted Practice Drill in ${weak.subjectName}`,
      rationale: targetChapter
        ? `Reassess "${targetChapter.chapterTitle}" (${targetChapter.averageAccuracy}% accuracy) after reviewing concepts.`
        : `Targeted questions help reinforce weak concepts before advancing.`,
      actionType: 'practice_test',
      targetTopic: weak.weakTopics[0],
      targetChapterId: targetChapter?.chapterId,
    });
  }

  for (const concept of frequentlyIncorrectConcepts.slice(0, 2)) {
    const subj = params.subjects.find((s) => s.name === concept.subjectName);
    if (!subj) continue;
    recommendedActions.push({
      id: `rec-assist-${subj.id}-${concept.topic}`,
      subjectId: subj.id,
      subjectName: subj.name,
      title: `Ask AI Study Assistant for step-by-step examples on "${concept.topic}"`,
      rationale: `Missed ${concept.missCount} time${concept.missCount === 1 ? '' : 's'} in recent evaluations.`,
      actionType: 'ask_assistant',
      targetTopic: concept.topic,
    });
  }

  if (recommendedActions.length === 0 && params.subjects.length > 0) {
    const unassessed = subjectSummaries.find((s) => s.assessmentsCount === 0) ?? subjectSummaries[0];
    recommendedActions.push({
      id: `rec-baseline-${unassessed.subjectId}`,
      subjectId: unassessed.subjectId,
      subjectName: unassessed.subjectName,
      title: `Complete a Diagnostic Chapter Test in ${unassessed.subjectName}`,
      rationale:
        'Real assessment results unlock chapter-level weakness detection and automatically calibrate your Skill Analysis.',
      actionType: 'practice_test',
    });
  }

  return {
    strongSubjects,
    weakSubjects,
    difficultChapters,
    frequentlyIncorrectConcepts,
    difficultyBreakdown,
    overallAccuracy,
    studyConsistencyPercent,
    recommendedActions: recommendedActions.slice(0, 6),
  };
}

const ALLOWED_EXTENSIONS = ['.txt', '.md', '.csv', '.json', '.pdf'];
const MAX_UPLOAD_BYTES = 200 * 1024; // 200 KB bounded for safe Firestore persistence

export function validateStudyMaterialFile(file: {
  name: string;
  size: number;
  type?: string;
}): { ok: true } | { ok: false; error: string } {
  const lower = file.name.toLowerCase();
  const validExt = ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
  if (!validExt) {
    return {
      ok: false,
      error: `Unsupported file type. Allowed formats: ${ALLOWED_EXTENSIONS.join(', ')}.`,
    };
  }
  if (file.size <= 0) {
    return { ok: false, error: 'Selected file is empty.' };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: 'File exceeds the 200 KB upload limit for workspace study materials.',
    };
  }
  return { ok: true };
}
