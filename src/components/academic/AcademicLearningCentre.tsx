import React, { useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BookOpen,
  Bot,
  Calendar,
  CheckSquare,
  Clock,
  GraduationCap,
  Layers,
  Target,
} from 'lucide-react';
import type {
  AcademicAssessmentResult,
  AcademicChapter,
  AcademicLearningSection,
  AcademicSubject,
  DashboardTab,
  StudentProfile,
  StudyMaterialItem,
  StudyPlannerSession,
} from '../../types/skillpath';
import type { AcademicWeaknessSummary } from '../../utils/academicAnalytics';
import { Button, ProgressBar, SurfaceCard } from '../ui/DesignSystem';
import {
  AcademicPerformancePanel,
  StudyPlannerPanel,
  WeaknessAnalysisPanel,
} from './AcademicAnalyticsView';
import { AiStudyAssistantView } from './AiStudyAssistantView';
import { AssessmentCentreView } from './AssessmentCentreView';
import { StudyMaterialsView } from './StudyMaterialsView';
import { SubjectsWorkspaceView } from './SubjectsWorkspaceView';

const ACADEMIC_SECTIONS: Array<{
  id: AcademicLearningSection;
  label: string;
  icon: React.ReactNode;
}> = [
  { id: 'overview', label: 'Study Overview', icon: <GraduationCap className="h-3.5 w-3.5" /> },
  { id: 'subjects', label: 'My Subjects', icon: <BookOpen className="h-3.5 w-3.5" /> },
  { id: 'materials', label: 'Learning Materials', icon: <Layers className="h-3.5 w-3.5" /> },
  { id: 'assistant', label: 'AI Study Assistant', icon: <Bot className="h-3.5 w-3.5" /> },
  { id: 'assessments', label: 'Assessments', icon: <CheckSquare className="h-3.5 w-3.5" /> },
  { id: 'practice', label: 'Practice Tests', icon: <Clock className="h-3.5 w-3.5" /> },
  { id: 'performance', label: 'Academic Performance', icon: <Activity className="h-3.5 w-3.5" /> },
  { id: 'planner', label: 'Study Planner', icon: <Calendar className="h-3.5 w-3.5" /> },
  { id: 'weakness', label: 'Weakness Analysis', icon: <Target className="h-3.5 w-3.5" /> },
];

interface AcademicLearningCentreProps {
  profile: StudentProfile;
  isDemo: boolean;
  subjects: AcademicSubject[];
  chapters: AcademicChapter[];
  materials: StudyMaterialItem[];
  assessments: AcademicAssessmentResult[];
  plannerSessions: StudyPlannerSession[];
  insights: AcademicWeaknessSummary;
  initialSection?: AcademicLearningSection;
  onNavigateDashboardTab: (tab: DashboardTab) => void;
  onCreateSubject: (
    input: Omit<AcademicSubject, 'id' | 'uid' | 'isDemo' | 'createdAtLabel'>
  ) => Promise<string>;
  onUpdateSubject: (
    subjectId: string,
    patch: Partial<
      Pick<
        AcademicSubject,
        'name' | 'category' | 'description' | 'linkedSkillId' | 'examDate' | 'targetGrade'
      >
    >
  ) => Promise<void>;
  onDeleteSubject: (subjectId: string) => Promise<void>;
  onCreateChapter: (
    subjectId: string,
    input: Omit<AcademicChapter, 'id' | 'uid' | 'subjectId'>
  ) => Promise<string>;
  onUpdateChapter: (
    subjectId: string,
    chapterId: string,
    patch: Partial<
      Pick<
        AcademicChapter,
        | 'orderIndex'
        | 'title'
        | 'topics'
        | 'learningObjectives'
        | 'importantConcepts'
        | 'completed'
        | 'estimatedHours'
      >
    >
  ) => Promise<void>;
  onDeleteChapter: (subjectId: string, chapterId: string) => Promise<void>;
  onCreateMaterial: (
    input: Omit<StudyMaterialItem, 'id' | 'uid' | 'createdAtLabel'>
  ) => Promise<string>;
  onDeleteMaterial: (materialId: string) => Promise<void>;
  onCompleteAssessment: (
    result: Omit<AcademicAssessmentResult, 'id' | 'uid' | 'createdAtLabel'>
  ) => Promise<AcademicAssessmentResult>;
  onCreateSession: (input: Omit<StudyPlannerSession, 'id' | 'uid'>) => Promise<string>;
  onToggleSession: (sessionId: string, completed: boolean) => Promise<void>;
  onDeleteSession: (sessionId: string) => Promise<void>;
}

export function AcademicLearningCentre({
  profile,
  isDemo,
  subjects,
  chapters,
  materials,
  assessments,
  plannerSessions,
  insights,
  initialSection = 'overview',
  onNavigateDashboardTab,
  onCreateSubject,
  onUpdateSubject,
  onDeleteSubject,
  onCreateChapter,
  onUpdateChapter,
  onDeleteChapter,
  onCreateMaterial,
  onDeleteMaterial,
  onCompleteAssessment,
  onCreateSession,
  onToggleSession,
  onDeleteSession,
}: AcademicLearningCentreProps) {
  const [activeSection, setActiveSection] = useState<AcademicLearningSection>(initialSection);
  const [contextSubjectId, setContextSubjectId] = useState<string | null>(subjects[0]?.id ?? null);
  const [contextChapterId, setContextChapterId] = useState<string | null>(null);
  const [contextTopic, setContextTopic] = useState<string>('');

  const weakTopicsBySubject = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const subj of subjects) {
      map[subj.id] = Array.from(
        new Set(
          assessments.filter((a) => a.subjectId === subj.id).flatMap((a) => a.weakTopics)
        )
      );
    }
    return map;
  }, [subjects, assessments]);

  const completedChaptersTotal = chapters.filter((c) => c.completed).length;
  const chapterCompletionPct =
    chapters.length === 0 ? 0 : Math.round((completedChaptersTotal / chapters.length) * 100);
  const todayIso = new Date().toISOString().slice(0, 10);
  const todaysPendingSessions = plannerSessions.filter(
    (s) => s.scheduledDate === todayIso && !s.completed
  );

  const routeToMaterials = (subjId: string, chapId?: string, topic?: string) => {
    setContextSubjectId(subjId);
    setContextChapterId(chapId || null);
    setContextTopic(topic || '');
    setActiveSection('materials');
  };

  const routeToAssessment = (
    subjId: string,
    chapId?: string,
    mode: 'assessments' | 'practice' = 'assessments'
  ) => {
    setContextSubjectId(subjId);
    setContextChapterId(chapId || null);
    setActiveSection(mode);
  };

  const routeToAssistant = (subjId: string, chapId?: string, topic?: string) => {
    setContextSubjectId(subjId);
    setContextChapterId(chapId || null);
    setContextTopic(topic || '');
    setActiveSection('assistant');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-[rgba(212,175,112,0.14)] pb-5 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <p className="text-xs font-medium tracking-[0.12em] uppercase text-[#D4AF70]">
            Integrated Academic Environment · {isDemo ? 'Demo Sample Workspace' : 'Live Student Workspace'}
          </p>
          <h2 className="font-display text-2xl font-bold text-[#F7F3EA]">
            Academic Learning Centre
          </h2>
          <p className="text-sm text-[#AAA6A0]">
            Subjects, level-adaptive Gemini study guides, assessments, and weakness diagnostics synced directly with Skill Analysis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button size="sm" variant="secondary" onClick={() => onNavigateDashboardTab('skills')}>
            View Skill Analysis
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" onClick={() => setActiveSection('assessments')}>
            Start Assessment
          </Button>
        </div>
      </div>

      {/* Unified 9-Section Navigation Bar */}
      <nav
        aria-label="Academic Learning sections"
        className="flex items-center gap-1.5 overflow-x-auto sm:flex-wrap sm:overflow-visible rounded-xl border border-[rgba(212,175,112,0.16)] bg-[#11121A] p-1.5"
      >
        {ACADEMIC_SECTIONS.map((sec) => {
          const active = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveSection(sec.id)}
              aria-current={active ? 'page' : undefined}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                active
                  ? 'bg-[#20212B] text-[#F5D78E] border border-[rgba(212,175,112,0.3)]'
                  : 'text-[#AAA6A0] border border-transparent hover:bg-[#171821] hover:text-[#F7F3EA]'
              }`}
            >
              <span className={active ? 'text-[#D4AF70]' : 'text-[#7D7973]'}>{sec.icon}</span>
              <span>{sec.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Section 1: Study Overview */}
      {activeSection === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SurfaceCard className="p-5">
              <p className="text-xs text-[#AAA6A0]">Active Subjects</p>
              <p className="mt-2 font-mono-tabular text-3xl font-semibold text-[#F7F3EA]">
                {subjects.length}
              </p>
              <p className="mt-1 text-xs text-[#7D7973]">
                {completedChaptersTotal}/{chapters.length} chapters completed ({chapterCompletionPct}%)
              </p>
            </SurfaceCard>

            <SurfaceCard className="p-5">
              <p className="text-xs text-[#AAA6A0]">Academic Accuracy</p>
              <p className="mt-2 font-mono-tabular text-3xl font-semibold text-[#F5D78E]">
                {insights.overallAccuracy !== null ? `${insights.overallAccuracy}%` : '—'}
              </p>
              <p className="mt-1 text-xs text-[#7D7973]">
                From {assessments.length} graded evaluation{assessments.length === 1 ? '' : 's'}
              </p>
            </SurfaceCard>

            <SurfaceCard className="p-5">
              <p className="text-xs text-[#AAA6A0]">Study Materials</p>
              <p className="mt-2 font-mono-tabular text-3xl font-semibold text-[#F7F3EA]">
                {materials.length}
              </p>
              <p className="mt-1 text-xs text-[#7D7973]">Notes, uploads &amp; AI study sheets</p>
            </SurfaceCard>

            <SurfaceCard className="p-5">
              <p className="text-xs text-[#AAA6A0]">Today&apos;s Planned Focus</p>
              <p className="mt-2 font-mono-tabular text-3xl font-semibold text-[#F7F3EA]">
                {todaysPendingSessions.length}
              </p>
              <p className="mt-1 text-xs text-[#7D7973]">
                {insights.studyConsistencyPercent}% overall planner completion
              </p>
            </SurfaceCard>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Subject Progress Grid */}
            <SurfaceCard className="p-6 lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="font-display text-base font-semibold text-[#F7F3EA]">
                    Subject Workspaces
                  </h3>
                  <p className="text-xs text-[#AAA6A0]">
                    Open any subject to manage chapters, upload files, or test mastery
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSection('subjects')}
                  className="text-xs font-medium text-[#D4AF70] hover:text-[#F5D78E]"
                >
                  Manage All
                </button>
              </div>

              {subjects.length === 0 ? (
                <div className="rounded-lg border border-[rgba(212,175,112,0.14)] bg-[#11121A] p-5 space-y-3">
                  <p className="text-sm text-[#AAA6A0]">
                    Your live academic workspace starts clean. Add your current courses to unlock chapters, study guides, and Skill-Analysis-linked assessments.
                  </p>
                  <Button size="sm" onClick={() => setActiveSection('subjects')}>
                    Add First Subject
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {subjects.map((subj) => {
                    const subjCh = chapters.filter((c) => c.subjectId === subj.id);
                    const done = subjCh.filter((c) => c.completed).length;
                    const pct = subjCh.length === 0 ? 0 : Math.round((done / subjCh.length) * 100);
                    const subjAssess = assessments.filter((a) => a.subjectId === subj.id);
                    const avg =
                      subjAssess.length === 0
                        ? null
                        : Math.round(
                            subjAssess.reduce((acc, a) => acc + a.scorePercent, 0) /
                              subjAssess.length
                          );

                    return (
                      <div
                        key={subj.id}
                        className="rounded-lg border border-[rgba(212,175,112,0.16)] bg-[#11121A] p-4 space-y-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <button
                              type="button"
                              onClick={() => {
                                setContextSubjectId(subj.id);
                                setActiveSection('subjects');
                              }}
                              className="font-display text-sm font-semibold text-[#F7F3EA] hover:text-[#F5D78E] text-left"
                            >
                              {subj.name}
                            </button>
                            <p className="text-xs text-[#7D7973]">
                              {subj.category} · {done}/{subjCh.length} chapters
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono-tabular text-xs text-[#F5D78E]">
                              {avg !== null ? `${avg}% avg` : 'Unassessed'}
                            </span>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => routeToAssessment(subj.id)}
                            >
                              Quiz
                            </Button>
                          </div>
                        </div>
                        <ProgressBar value={pct} showValue={false} />
                      </div>
                    );
                  })}
                </div>
              )}
            </SurfaceCard>

            {/* Personalized Study Focus & Today's Schedule */}
            <SurfaceCard className="p-6 lg:col-span-5 space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-semibold text-[#F7F3EA]">
                    Priority Focus Areas
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveSection('weakness')}
                    className="text-xs font-medium text-[#D4AF70] hover:text-[#F5D78E]"
                  >
                    Weakness Analysis
                  </button>
                </div>

                {insights.recommendedActions.length === 0 ? (
                  <p className="text-xs text-[#7D7973]">
                    Complete a diagnostic assessment to generate targeted remediation recommendations.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {insights.recommendedActions.slice(0, 3).map((rec) => (
                      <div
                        key={rec.id}
                        className="rounded-lg border border-[rgba(212,175,112,0.14)] bg-[#11121A] p-3 space-y-1.5"
                      >
                        <p className="text-xs font-medium text-[#F7F3EA]">{rec.title}</p>
                        <p className="text-[11px] text-[#AAA6A0]">{rec.rationale}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3 border-t border-[rgba(212,175,112,0.14)] pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-display text-sm font-semibold text-[#F7F3EA]">
                    Today&apos;s Study Planner
                  </h4>
                  <button
                    type="button"
                    onClick={() => setActiveSection('planner')}
                    className="text-xs font-medium text-[#D4AF70] hover:text-[#F5D78E]"
                  >
                    Open Planner
                  </button>
                </div>

                {todaysPendingSessions.length === 0 ? (
                  <p className="text-xs text-[#7D7973]">
                    No pending sessions scheduled for today.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {todaysPendingSessions.slice(0, 3).map((sess) => (
                      <li
                        key={sess.id}
                        className="rounded-lg border border-[rgba(212,175,112,0.14)] bg-[#11121A] px-3 py-2 text-xs"
                      >
                        <p className="font-medium text-[#F7F3EA]">{sess.title}</p>
                        <p className="text-[#7D7973]">
                          {sess.subjectName} · {sess.durationMinutes} min
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </SurfaceCard>
          </div>
        </div>
      )}

      {activeSection === 'subjects' && (
        <SubjectsWorkspaceView
          subjects={subjects}
          chapters={chapters}
          materials={materials}
          assessments={assessments}
          selectedSubjectId={contextSubjectId}
          onSelectSubject={setContextSubjectId}
          onCreateSubject={onCreateSubject}
          onUpdateSubject={onUpdateSubject}
          onDeleteSubject={onDeleteSubject}
          onCreateChapter={onCreateChapter}
          onUpdateChapter={onUpdateChapter}
          onDeleteChapter={onDeleteChapter}
          onCreateMaterial={onCreateMaterial}
          onDeleteMaterial={onDeleteMaterial}
          onOpenMaterialsForSubject={(subjId, chapId) => routeToMaterials(subjId, chapId)}
          onStartAssessmentForSubject={(subjId, chapId) => routeToAssessment(subjId, chapId)}
          onAskAssistantForSubject={(subjId, chapId) => routeToAssistant(subjId, chapId)}
        />
      )}

      {activeSection === 'materials' && (
        <StudyMaterialsView
          subjects={subjects}
          chapters={chapters}
          materials={materials}
          isDemo={isDemo}
          defaultSubjectId={contextSubjectId}
          defaultChapterId={contextChapterId}
          defaultTopic={contextTopic}
          onSaveMaterial={onCreateMaterial}
          onDeleteMaterial={onDeleteMaterial}
        />
      )}

      {activeSection === 'assistant' && (
        <AiStudyAssistantView
          profile={profile}
          subjects={subjects}
          chapters={chapters}
          materials={materials}
          weakTopicsBySubject={weakTopicsBySubject}
          isDemo={isDemo}
          defaultSubjectId={contextSubjectId}
          defaultTopic={contextTopic}
        />
      )}

      {(activeSection === 'assessments' || activeSection === 'practice') && (
        <AssessmentCentreView
          mode={activeSection === 'practice' ? 'practice' : 'assessments'}
          uid={profile.uid}
          isDemo={isDemo}
          subjects={subjects}
          chapters={chapters}
          materials={materials}
          assessmentsHistory={assessments}
          defaultSubjectId={contextSubjectId}
          defaultChapterId={contextChapterId}
          onCompleteAssessment={onCompleteAssessment}
          onOpenWeaknessAnalysis={() => setActiveSection('weakness')}
        />
      )}

      {activeSection === 'performance' && (
        <AcademicPerformancePanel
          subjects={subjects}
          chapters={chapters}
          assessments={assessments}
          insights={insights}
        />
      )}

      {activeSection === 'planner' && (
        <StudyPlannerPanel
          subjects={subjects}
          chapters={chapters}
          sessions={plannerSessions}
          insights={insights}
          onCreateSession={onCreateSession}
          onToggleSession={onToggleSession}
          onDeleteSession={onDeleteSession}
        />
      )}

      {activeSection === 'weakness' && (
        <WeaknessAnalysisPanel
          subjects={subjects}
          insights={insights}
          onGenerateRemediationNotes={(subjId, topic) =>
            routeToMaterials(subjId, undefined, topic)
          }
          onStartTargetedPractice={(subjId, chapId) =>
            routeToAssessment(subjId, chapId, 'practice')
          }
          onAskAssistant={(subjId, topic) => routeToAssistant(subjId, undefined, topic)}
          onScheduleRevision={(subjId) => {
            setContextSubjectId(subjId);
            setActiveSection('planner');
          }}
        />
      )}
    </div>
  );
}
