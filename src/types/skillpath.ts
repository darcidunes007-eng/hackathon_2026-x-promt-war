export type UserRole = 'student' | 'admin';

export type WorkspaceMode = 'landing' | 'auth' | 'demo-student' | 'demo-admin' | 'live';

export type DashboardTab =
  | 'overview'
  | 'academic'
  | 'skills'
  | 'careers'
  | 'roadmap'
  | 'mentor'
  | 'profile'
  | 'admin';

export type SkillCategoryId =
  | 'systems_architecture'
  | 'applied_ml'
  | 'algorithmic_reasoning'
  | 'fullstack_engineering'
  | 'quantitative_literacy'
  | 'technical_communication';

export interface SkillCategoryDefinition {
  id: SkillCategoryId;
  label: string;
  shortLabel: string;
  description: string;
}

export interface LearningGoal {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
  category: string;
}

export interface StudentProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: UserRole;
  academicTrack: string;
  institution: string;
  graduationYear: number;
  careerInterests: string[];
  selectedCareerId: string;
  skillScores: Record<SkillCategoryId, number>;
  completedMilestones: string[];
  learningGoals: LearningGoal[];
  weeklyStudyHours: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SkillAssessmentRecord {
  id: string;
  uid: string;
  overallScore: number;
  categoryScores: Record<SkillCategoryId, number>;
  summaryNote: string;
  createdAtLabel: string;
}

export interface RoadmapMilestone {
  id: string;
  title: string;
  durationWeeks: number;
  focusSkill: SkillCategoryId;
  deliverable: string;
  resources: { title: string; format: 'Course' | 'Paper' | 'Project' | 'Book' }[];
}

export interface RoadmapStage {
  stageNumber: number;
  title: string;
  objective: string;
  milestones: RoadmapMilestone[];
}

export interface CareerPathway {
  id: string;
  title: string;
  domain: 'AI & ML' | 'Systems' | 'Product Engineering' | 'Quantitative';
  summary: string;
  compensationRange: string;
  demandOutlook: string;
  requiredSkills: Record<SkillCategoryId, number>;
  coreCompetencies: string[];
  stages: RoadmapStage[];
}

export type MentorAgentRole =
  | 'orchestrator'
  | 'career_strategist'
  | 'curriculum_architect'
  | 'technical_tutor'
  | 'assessment_coach';

export interface MentorMessage {
  id: string;
  sender: 'user' | 'agent';
  agentRole?: MentorAgentRole;
  agentLabel?: string;
  coordinationSummary?: string;
  content: string;
  actionableSteps?: string[];
  followUpQuestions?: string[];
  timestamp: string;
  isError?: boolean;
}

export interface MentorSession {
  id: string;
  uid: string;
  agentRole: MentorAgentRole;
  title: string;
  messages: MentorMessage[];
  updatedAtLabel: string;
}

export interface ActivityEntry {
  id: string;
  uid: string;
  category: 'roadmap' | 'assessment' | 'career' | 'mentor' | 'profile';
  title: string;
  detail: string;
  createdAtLabel: string;
}

export interface AdminStudentSummary {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  academicTrack: string;
  institution: string;
  selectedCareerTitle: string;
  readinessScore: number;
  roadmapPercent: number;
  weeklyStudyHours: number;
}

// === Academic Learning Centre Domain Types ===

export type AcademicLearningSection =
  | 'overview'
  | 'subjects'
  | 'materials'
  | 'assistant'
  | 'assessments'
  | 'practice'
  | 'performance'
  | 'planner'
  | 'weakness';

export type AcademicSubjectCategory =
  | 'Mathematics'
  | 'Physics'
  | 'Chemistry'
  | 'Computer Science'
  | 'Programming'
  | 'Artificial Intelligence'
  | 'Data Science'
  | 'English'
  | 'Other';

export interface AcademicSubject {
  id: string;
  uid: string;
  name: string;
  category: AcademicSubjectCategory;
  description: string;
  linkedSkillId: SkillCategoryId;
  examDate?: string;
  targetGrade?: string;
  isDemo?: boolean;
  createdAtLabel?: string;
}

export interface AcademicChapter {
  id: string;
  uid: string;
  subjectId: string;
  orderIndex: number;
  title: string;
  topics: string[];
  learningObjectives: string[];
  importantConcepts: string[];
  completed: boolean;
  estimatedHours: number;
}

export type StudyMaterialFormat =
  | 'Explanation'
  | 'Detailed Notes'
  | 'Definitions'
  | 'Formula Sheet'
  | 'Concept Summary'
  | 'Revision Notes'
  | 'Real-World Examples'
  | 'Frequently Tested'
  | 'Practice Questions'
  | 'Chapter Summary'
  | 'Uploaded Document'
  | 'Reference Link'
  | 'Video Resource';

export type ExplanationLevel =
  | 'Beginner'
  | 'Intermediate'
  | 'Advanced'
  | 'Exam Preparation';

export interface StudyMaterialItem {
  id: string;
  uid: string;
  subjectId: string;
  chapterId?: string;
  topic: string;
  title: string;
  format: StudyMaterialFormat;
  level: ExplanationLevel;
  content: string;
  externalUrl?: string;
  fileName?: string;
  fileSizeBytes?: number;
  sourceType: 'student_upload' | 'student_note' | 'ai_generated';
  aiDisclaimer?: string;
  createdAtLabel: string;
}

export type AcademicQuestionType =
  | 'mcq'
  | 'multiple_select'
  | 'short_answer'
  | 'long_answer'
  | 'numerical'
  | 'conceptual';

export type AcademicDifficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'Exam';

export interface AcademicQuestion {
  id: string;
  type: AcademicQuestionType;
  topic: string;
  difficulty: AcademicDifficulty;
  prompt: string;
  options?: string[];
  correctOptionIndex?: number;
  correctOptionIndices?: number[];
  correctNumericalAnswer?: number;
  numericalTolerance?: number;
  referenceAnswer?: string;
  keyPoints?: string[];
  explanation: string;
  aiGenerated?: boolean;
}

export interface AcademicQuestionResponseReview {
  questionId: string;
  prompt: string;
  type: AcademicQuestionType;
  topic: string;
  difficulty: AcademicDifficulty;
  userAnswerLabel: string;
  expectedAnswerLabel: string;
  isCorrect: boolean;
  needsHumanReview: boolean;
  scoreRatio: number; // 0..1
  feedback: string;
  explanation: string;
}

export interface AcademicAssessmentResult {
  id: string;
  uid: string;
  subjectId: string;
  subjectName: string;
  chapterId?: string;
  chapterTitle?: string;
  linkedSkillId: SkillCategoryId;
  mode: 'chapter_test' | 'subject_test' | 'timed_practice';
  difficulty: AcademicDifficulty;
  totalQuestions: number;
  correctCount: number;
  scorePercent: number;
  durationMinutes: number;
  requiresHumanReview: boolean;
  weakTopics: string[];
  reviews: AcademicQuestionResponseReview[];
  createdAtLabel: string;
}

export interface StudyPlannerSession {
  id: string;
  uid: string;
  subjectId: string;
  subjectName: string;
  chapterId?: string;
  chapterTitle?: string;
  title: string;
  sessionType: 'study' | 'revision' | 'exam_prep' | 'practice';
  scheduledDate: string; // YYYY-MM-DD
  durationMinutes: number;
  completed: boolean;
  priority: 'recommended' | 'standard';
}

export interface AcademicProgressSummary {
  id: string; // subjectId
  uid: string;
  subjectId: string;
  subjectName: string;
  linkedSkillId: SkillCategoryId;
  assessmentsCompleted: number;
  averageAccuracy: number;
  latestScorePercent: number;
  completedChapters: number;
  totalChapters: number;
  weakTopics: string[];
  updatedAtLabel: string;
}

