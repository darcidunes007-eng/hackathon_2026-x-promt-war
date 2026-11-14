import { CAREER_PATHWAYS, DEFAULT_SKILL_SCORES, SKILL_CATEGORIES } from '../data/curriculum';
import type {
  CareerPathway,
  LearningGoal,
  SkillCategoryId,
  StudentProfile,
} from '../types/skillpath';

export interface SkillGapItem {
  categoryId: SkillCategoryId;
  label: string;
  current: number;
  target: number;
  delta: number; // positive means exceeds/meets, negative means gap
  status: 'Strength' | 'On Track' | 'Focus Area';
}

export interface RoadmapProgressSummary {
  completedCount: number;
  totalCount: number;
  percentage: number;
  stages: {
    stageNumber: number;
    title: string;
    completed: number;
    total: number;
    percentage: number;
  }[];
}

export function getCareerById(careerId: string | undefined): CareerPathway {
  return CAREER_PATHWAYS.find((c) => c.id === careerId) ?? CAREER_PATHWAYS[0];
}

export function calculateOverallReadiness(
  skillScores: Record<SkillCategoryId, number>,
  career: CareerPathway
): number {
  let weightedRatioSum = 0;
  let weightSum = 0;

  for (const category of SKILL_CATEGORIES) {
    const target = Math.max(1, career.requiredSkills[category.id] ?? 75);
    const current = Math.max(0, Math.min(100, skillScores[category.id] ?? 0));
    const ratio = Math.min(1.0, current / target);
    weightedRatioSum += ratio * target;
    weightSum += target;
  }

  if (weightSum === 0) return 0;
  return Math.min(100, Math.round((weightedRatioSum / weightSum) * 100));
}

export function calculateAverageSkillScore(skillScores: Record<SkillCategoryId, number>): number {
  const values = SKILL_CATEGORIES.map((c) => Math.max(0, Math.min(100, skillScores[c.id] ?? 0)));
  if (values.length === 0) return 0;
  return Math.round(values.reduce((acc, v) => acc + v, 0) / values.length);
}

export function calculateSkillGaps(
  skillScores: Record<SkillCategoryId, number>,
  career: CareerPathway
): SkillGapItem[] {
  return SKILL_CATEGORIES.map((cat) => {
    const current = Math.max(0, Math.min(100, skillScores[cat.id] ?? 0));
    const target = career.requiredSkills[cat.id] ?? 75;
    const delta = current - target;
    let status: SkillGapItem['status'] = 'On Track';
    if (delta >= 0) status = 'Strength';
    else if (delta <= -10) status = 'Focus Area';

    return {
      categoryId: cat.id,
      label: cat.label,
      current,
      target,
      delta,
      status,
    };
  }).sort((a, b) => a.delta - b.delta);
}

export function calculateRoadmapProgress(
  completedMilestones: string[],
  career: CareerPathway
): RoadmapProgressSummary {
  const completedSet = new Set(completedMilestones);
  let totalCount = 0;
  let completedCount = 0;

  const stages = career.stages.map((stage) => {
    const total = stage.milestones.length;
    const completed = stage.milestones.filter((m) => completedSet.has(m.id)).length;
    totalCount += total;
    completedCount += completed;
    return {
      stageNumber: stage.stageNumber,
      title: stage.title,
      completed,
      total,
      percentage: total === 0 ? 0 : Math.round((completed / total) * 100),
    };
  });

  return {
    completedCount,
    totalCount,
    percentage: totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100),
    stages,
  };
}

export function isValidFirestoreId(id: string): boolean {
  return typeof id === 'string' && id.length >= 1 && id.length <= 128 && /^[a-zA-Z0-9_-]+$/.test(id);
}

export function clampText(value: unknown, maxLength: number, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  return value.trim().slice(0, maxLength);
}

export function sanitizeSkillScores(
  scores: Partial<Record<SkillCategoryId, number>> | undefined
): Record<SkillCategoryId, number> {
  const sanitized = { ...DEFAULT_SKILL_SCORES };
  if (!scores || typeof scores !== 'object') return sanitized;
  for (const cat of SKILL_CATEGORIES) {
    const raw = scores[cat.id];
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      sanitized[cat.id] = Math.max(0, Math.min(100, Math.round(raw)));
    }
  }
  return sanitized;
}

export function sanitizeLearningGoals(goals: LearningGoal[] | undefined): LearningGoal[] {
  if (!Array.isArray(goals)) return [];
  return goals.slice(0, 15).map((g, idx) => ({
    id: clampText(g.id, 64, `goal-${idx + 1}`),
    title: clampText(g.title, 140, 'Untitled learning goal'),
    dueDate: clampText(g.dueDate, 32, 'Upcoming'),
    completed: Boolean(g.completed),
    category: clampText(g.category, 40, 'General'),
  }));
}

export function sanitizeStudentPatch(
  patch: Partial<StudentProfile>
): Partial<StudentProfile> {
  const out: Partial<StudentProfile> = {};

  if (patch.displayName !== undefined) {
    const name = clampText(patch.displayName, 120);
    if (name.length >= 1) out.displayName = name;
  }
  if (patch.photoURL !== undefined) {
    out.photoURL = clampText(patch.photoURL, 1024);
  }
  if (patch.academicTrack !== undefined) {
    out.academicTrack = clampText(patch.academicTrack, 140);
  }
  if (patch.institution !== undefined) {
    out.institution = clampText(patch.institution, 160);
  }
  if (patch.graduationYear !== undefined && Number.isFinite(patch.graduationYear)) {
    out.graduationYear = Math.max(1990, Math.min(2045, Math.round(patch.graduationYear)));
  }
  if (patch.careerInterests !== undefined && Array.isArray(patch.careerInterests)) {
    out.careerInterests = patch.careerInterests
      .map((item) => clampText(item, 60))
      .filter(Boolean)
      .slice(0, 10);
  }
  if (patch.selectedCareerId !== undefined && isValidFirestoreId(patch.selectedCareerId)) {
    out.selectedCareerId = patch.selectedCareerId.slice(0, 80);
  }
  if (patch.skillScores !== undefined) {
    out.skillScores = sanitizeSkillScores(patch.skillScores);
  }
  if (patch.completedMilestones !== undefined && Array.isArray(patch.completedMilestones)) {
    out.completedMilestones = patch.completedMilestones
      .map((m) => clampText(m, 80))
      .filter(Boolean)
      .slice(0, 40);
  }
  if (patch.learningGoals !== undefined) {
    out.learningGoals = sanitizeLearningGoals(patch.learningGoals);
  }
  if (patch.weeklyStudyHours !== undefined && Number.isFinite(patch.weeklyStudyHours)) {
    out.weeklyStudyHours = Math.max(0, Math.min(120, Math.round(patch.weeklyStudyHours)));
  }

  return out;
}
