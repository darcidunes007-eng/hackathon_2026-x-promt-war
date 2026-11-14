export type UserRole = 'student' | 'admin';

export type WorkspaceMode = 'landing' | 'auth' | 'demo-student' | 'demo-admin' | 'live';

export type DashboardTab =
  | 'overview'
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
