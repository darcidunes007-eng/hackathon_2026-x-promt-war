import { useEffect, useMemo, useRef, useState } from 'react';
import { getRedirectResult, onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { AcademicLearningCentre } from './components/academic/AcademicLearningCentre';
import { AuthPortal } from './components/auth/AuthPortal';
import { MidnightAtmosphere } from './components/atmosphere/MidnightAtmosphere';
import { AdminDashboardView } from './components/dashboard/AdminDashboardView';
import { AiMentorView } from './components/dashboard/AiMentorView';
import { CareerExplorerView } from './components/dashboard/CareerExplorerView';
import { DashboardShell } from './components/dashboard/DashboardShell';
import { LearningRoadmapView } from './components/dashboard/LearningRoadmapView';
import { ProfileSettingsView } from './components/dashboard/ProfileSettingsView';
import { SkillAnalysisView } from './components/dashboard/SkillAnalysisView';
import { StudentOverview } from './components/dashboard/StudentOverview';
import {
  DEMO_ACADEMIC_ASSESSMENTS,
  DEMO_ACADEMIC_CHAPTERS,
  DEMO_ACADEMIC_SUBJECTS,
  DEMO_STUDY_MATERIALS,
  DEMO_STUDY_SESSIONS,
} from './data/academicDemoData';
import { LandingPage } from './components/landing/LandingPage';
import {
  DEMO_ACTIVITY,
  DEMO_ASSESSMENTS,
  DEMO_STUDENT_PROFILE,
} from './data/curriculum';
import {
  createAcademicChapter,
  createAcademicSubject,
  createStudyMaterial,
  createStudySession,
  deleteAcademicChapter,
  deleteAcademicSubject,
  deleteStudyMaterial,
  deleteStudySession,
  saveAcademicAssessmentResult,
  subscribeToAcademicWorkspace,
  updateAcademicChapter,
  updateAcademicSubject,
  updateStudySession,
  upsertAcademicProgress,
} from './lib/academicService';
import { auth, authPersistenceReady } from './lib/firebase';
import {
  deleteMentorSession,
  ensureStudentProfileFromAuth,
  formatFirestoreUserMessage,
  logStudentActivity,
  recordAssessmentSnapshot,
  saveMentorSession,
  subscribeToStudentWorkspace,
  updateStudentProfile,
  verifyServerAdminSession,
} from './lib/studentService';
import type {
  AcademicAssessmentResult,
  AcademicChapter,
  AcademicLearningSection,
  AcademicProgressSummary,
  AcademicSubject,
  ActivityEntry,
  DashboardTab,
  LearningGoal,
  MentorAgentRole,
  MentorMessage,
  MentorSession,
  SkillAssessmentRecord,
  SkillCategoryId,
  StudentProfile,
  StudyMaterialItem,
  StudyPlannerSession,
  WorkspaceMode,
} from './types/skillpath';
import {
  computeAcademicInsights,
  computeUpdatedSkillScoresFromAssessment,
} from './utils/academicAnalytics';
import { calculateAverageSkillScore, getCareerById } from './utils/skillAnalytics';

export default function App() {
  const [mode, setMode] = useState<WorkspaceMode>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return 'demo-student';
    }
    return 'landing';
  });
  const [authTab, setAuthTab] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [authReady, setAuthReady] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isAdminAuthorized, setIsAdminAuthorized] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  // Live or Demo student state
  const [profile, setProfile] = useState<StudentProfile>(DEMO_STUDENT_PROFILE);
  const [assessments, setAssessments] = useState<SkillAssessmentRecord[]>(DEMO_ASSESSMENTS);
  const [activity, setActivity] = useState<ActivityEntry[]>(DEMO_ACTIVITY);
  const [mentorSessions, setMentorSessions] = useState<MentorSession[]>([]);

  // Academic Learning Centre state (Demo initialized cleanly, Live streamed per-user)
  const [academicSubjects, setAcademicSubjects] =
    useState<AcademicSubject[]>(DEMO_ACADEMIC_SUBJECTS);
  const [academicChapters, setAcademicChapters] =
    useState<AcademicChapter[]>(DEMO_ACADEMIC_CHAPTERS);
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterialItem[]>(DEMO_STUDY_MATERIALS);
  const [academicAssessments, setAcademicAssessments] = useState<AcademicAssessmentResult[]>(
    DEMO_ACADEMIC_ASSESSMENTS
  );
  const [studySessions, setStudySessions] = useState<StudyPlannerSession[]>(DEMO_STUDY_SESSIONS);
  const [academicProgress, setAcademicProgress] = useState<AcademicProgressSummary[]>([]);
  const [academicInitialSection, setAcademicInitialSection] =
    useState<AcademicLearningSection>('overview');

  const unsubWorkspaceRef = useRef<(() => void) | null>(null);
  const unsubAcademicRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let active = true;
    let unsubAuth: (() => void) | null = null;

    void (async () => {
      await authPersistenceReady;
      if (!active) return;

      void getRedirectResult(auth).catch((err) => {
        console.error('Redirect sign-in result error:', err);
      });

      unsubAuth = onAuthStateChanged(auth, async (user) => {
        if (!active) return;
        setFirebaseUser(user);
        setAuthReady(true);

        if (unsubWorkspaceRef.current) {
          unsubWorkspaceRef.current();
          unsubWorkspaceRef.current = null;
        }
        if (unsubAcademicRef.current) {
          unsubAcademicRef.current();
          unsubAcademicRef.current = null;
        }

        if (!user) {
          setIsAdminAuthorized(false);
          setMentorSessions([]);
          setMode((prev) => (prev === 'live' ? 'auth' : prev));
          return;
        }

        try {
          const [initialProfile, adminOk] = await Promise.all([
            ensureStudentProfileFromAuth(user),
            verifyServerAdminSession(user),
          ]);
          if (!active) return;

          setProfile(initialProfile);
          setIsAdminAuthorized(adminOk);
          setMode('live');
          setActiveTab((prev) => (adminOk ? 'admin' : prev === 'admin' ? 'overview' : prev));
          setWorkspaceError(null);

          // Strictly isolate Live mode from Demo academic records
          setAcademicSubjects([]);
          setAcademicChapters([]);
          setStudyMaterials([]);
          setAcademicAssessments([]);
          setStudySessions([]);
          setAcademicProgress([]);

          unsubWorkspaceRef.current = subscribeToStudentWorkspace(user.uid, {
            onProfile: (p) => setProfile(p),
            onAssessments: (records) => setAssessments(records),
            onActivity: (entries) => setActivity(entries),
            onSessions: (sessions) => setMentorSessions(sessions),
            onError: (err) => setWorkspaceError(formatFirestoreUserMessage(err)),
          });

          unsubAcademicRef.current = subscribeToAcademicWorkspace(user.uid, {
            onSubjects: (items) => setAcademicSubjects(items),
            onChapters: (items) => setAcademicChapters(items),
            onMaterials: (items) => setStudyMaterials(items),
            onAssessments: (items) => setAcademicAssessments(items),
            onSessions: (items) => setStudySessions(items),
            onProgress: (items) => setAcademicProgress(items),
            onError: (err) => setWorkspaceError(formatFirestoreUserMessage(err)),
          });
        } catch (err) {
          console.error('Workspace bootstrap failed:', err);
          setWorkspaceError(formatFirestoreUserMessage(err));
        }
      });
    })();

    return () => {
      active = false;
      if (unsubAuth) unsubAuth();
      if (unsubWorkspaceRef.current) {
        unsubWorkspaceRef.current();
        unsubWorkspaceRef.current = null;
      }
      if (unsubAcademicRef.current) {
        unsubAcademicRef.current();
        unsubAcademicRef.current = null;
      }
    };
  }, []);

  const enterDemoStudent = () => {
    setProfile({ ...DEMO_STUDENT_PROFILE });
    setAssessments([...DEMO_ASSESSMENTS]);
    setActivity([...DEMO_ACTIVITY]);
    setMentorSessions([]);
    setAcademicSubjects([...DEMO_ACADEMIC_SUBJECTS]);
    setAcademicChapters([...DEMO_ACADEMIC_CHAPTERS]);
    setStudyMaterials([...DEMO_STUDY_MATERIALS]);
    setAcademicAssessments([...DEMO_ACADEMIC_ASSESSMENTS]);
    setStudySessions([...DEMO_STUDY_SESSIONS]);
    setAcademicProgress([]);
    setIsAdminAuthorized(false);
    setWorkspaceError(null);
    setMode('demo-student');
    setActiveTab('overview');
  };

  const enterDemoAdmin = () => {
    setProfile({ ...DEMO_STUDENT_PROFILE, role: 'admin' });
    setAssessments([...DEMO_ASSESSMENTS]);
    setActivity([...DEMO_ACTIVITY]);
    setMentorSessions([]);
    setAcademicSubjects([...DEMO_ACADEMIC_SUBJECTS]);
    setAcademicChapters([...DEMO_ACADEMIC_CHAPTERS]);
    setStudyMaterials([...DEMO_STUDY_MATERIALS]);
    setAcademicAssessments([...DEMO_ACADEMIC_ASSESSMENTS]);
    setStudySessions([...DEMO_STUDY_SESSIONS]);
    setAcademicProgress([]);
    setIsAdminAuthorized(true);
    setWorkspaceError(null);
    setMode('demo-admin');
    setActiveTab('admin');
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      if (unsubWorkspaceRef.current) {
        unsubWorkspaceRef.current();
        unsubWorkspaceRef.current = null;
      }
      if (unsubAcademicRef.current) {
        unsubAcademicRef.current();
        unsubAcademicRef.current = null;
      }
      if (firebaseUser) {
        await signOut(auth);
      }
      setFirebaseUser(null);
      setIsAdminAuthorized(false);
      setWorkspaceError(null);
      setProfile({ ...DEMO_STUDENT_PROFILE });
      setAssessments([...DEMO_ASSESSMENTS]);
      setActivity([...DEMO_ACTIVITY]);
      setMentorSessions([]);
      setAcademicSubjects([...DEMO_ACADEMIC_SUBJECTS]);
      setAcademicChapters([...DEMO_ACADEMIC_CHAPTERS]);
      setStudyMaterials([...DEMO_STUDY_MATERIALS]);
      setAcademicAssessments([...DEMO_ACADEMIC_ASSESSMENTS]);
      setStudySessions([...DEMO_STUDY_SESSIONS]);
      setAcademicProgress([]);
      setMode('landing');
      setActiveTab('overview');
    } finally {
      setSigningOut(false);
    }
  };

  const isDemo = mode === 'demo-student' || mode === 'demo-admin';

  const academicInsights = useMemo(
    () =>
      computeAcademicInsights({
        subjects: academicSubjects,
        chapters: academicChapters,
        assessments: academicAssessments,
        materials: studyMaterials,
        plannerSessions: studySessions,
      }),
    [academicSubjects, academicChapters, academicAssessments, studyMaterials, studySessions]
  );

  // Academic Learning Centre CRUD & Skill Analysis Sync Handlers
  const handleCreateAcademicSubject = async (
    input: Omit<AcademicSubject, 'id' | 'uid' | 'isDemo' | 'createdAtLabel'>
  ): Promise<string> => {
    if (isDemo) {
      const id = `demo-subj-${Date.now()}`;
      setAcademicSubjects((prev) => [
        ...prev,
        {
          ...input,
          id,
          uid: profile.uid,
          isDemo: true,
          createdAtLabel: 'Demo Session',
        },
      ]);
      return id;
    }
    if (!firebaseUser) throw new Error('Authentication required to create subjects.');
    return createAcademicSubject(firebaseUser.uid, input);
  };

  const handleUpdateAcademicSubject = async (
    subjectId: string,
    patch: Partial<
      Pick<
        AcademicSubject,
        'name' | 'category' | 'description' | 'linkedSkillId' | 'examDate' | 'targetGrade'
      >
    >
  ) => {
    if (isDemo) {
      setAcademicSubjects((prev) =>
        prev.map((s) => (s.id === subjectId ? { ...s, ...patch } : s))
      );
      return;
    }
    if (firebaseUser) {
      await updateAcademicSubject(firebaseUser.uid, subjectId, patch);
    }
  };

  const handleDeleteAcademicSubject = async (subjectId: string) => {
    if (isDemo) {
      setAcademicSubjects((prev) => prev.filter((s) => s.id !== subjectId));
      setAcademicChapters((prev) => prev.filter((c) => c.subjectId !== subjectId));
      return;
    }
    if (firebaseUser) {
      await deleteAcademicSubject(firebaseUser.uid, subjectId);
    }
  };

  const handleCreateAcademicChapter = async (
    subjectId: string,
    input: Omit<AcademicChapter, 'id' | 'uid' | 'subjectId'>
  ): Promise<string> => {
    if (isDemo) {
      const id = `demo-ch-${Date.now()}`;
      setAcademicChapters((prev) => [...prev, { ...input, id, uid: profile.uid, subjectId }]);
      return id;
    }
    if (!firebaseUser) throw new Error('Authentication required to add chapters.');
    return createAcademicChapter(firebaseUser.uid, subjectId, input);
  };

  const handleUpdateAcademicChapter = async (
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
  ) => {
    if (isDemo) {
      setAcademicChapters((prev) =>
        prev.map((c) => (c.id === chapterId ? { ...c, ...patch } : c))
      );
      return;
    }
    if (firebaseUser) {
      await updateAcademicChapter(firebaseUser.uid, subjectId, chapterId, patch);
    }
  };

  const handleDeleteAcademicChapter = async (subjectId: string, chapterId: string) => {
    if (isDemo) {
      setAcademicChapters((prev) => prev.filter((c) => c.id !== chapterId));
      return;
    }
    if (firebaseUser) {
      await deleteAcademicChapter(firebaseUser.uid, subjectId, chapterId);
    }
  };

  const handleCreateStudyMaterial = async (
    input: Omit<StudyMaterialItem, 'id' | 'uid' | 'createdAtLabel'>
  ): Promise<string> => {
    if (isDemo) {
      const id = `demo-mat-${Date.now()}`;
      setStudyMaterials((prev) => [
        { ...input, id, uid: profile.uid, createdAtLabel: 'Just now (Demo)' },
        ...prev,
      ]);
      return id;
    }
    if (!firebaseUser) throw new Error('Authentication required to save materials.');
    return createStudyMaterial(firebaseUser.uid, input);
  };

  const handleDeleteStudyMaterial = async (materialId: string) => {
    if (isDemo) {
      setStudyMaterials((prev) => prev.filter((m) => m.id !== materialId));
      return;
    }
    if (firebaseUser) {
      await deleteStudyMaterial(firebaseUser.uid, materialId);
    }
  };

  const handleCreateStudySession = async (
    input: Omit<StudyPlannerSession, 'id' | 'uid'>
  ): Promise<string> => {
    if (isDemo) {
      const id = `demo-sess-${Date.now()}`;
      setStudySessions((prev) => [...prev, { ...input, id, uid: profile.uid }]);
      return id;
    }
    if (!firebaseUser) throw new Error('Authentication required to schedule study sessions.');
    return createStudySession(firebaseUser.uid, input);
  };

  const handleToggleStudySession = async (sessionId: string, completed: boolean) => {
    if (isDemo) {
      setStudySessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, completed } : s))
      );
      return;
    }
    if (firebaseUser) {
      await updateStudySession(firebaseUser.uid, sessionId, { completed });
    }
  };

  const handleDeleteStudySession = async (sessionId: string) => {
    if (isDemo) {
      setStudySessions((prev) => prev.filter((s) => s.id !== sessionId));
      return;
    }
    if (firebaseUser) {
      await deleteStudySession(firebaseUser.uid, sessionId);
    }
  };

  const handleCompleteAcademicAssessment = async (
    draft: Omit<AcademicAssessmentResult, 'id' | 'uid' | 'createdAtLabel'>
  ): Promise<AcademicAssessmentResult> => {
    const priorForSkill = academicAssessments.filter(
      (a) => a.linkedSkillId === draft.linkedSkillId
    );
    const provisionalResult: AcademicAssessmentResult = {
      ...draft,
      id: `acad-assess-${Date.now()}`,
      uid: profile.uid,
      createdAtLabel: isDemo ? 'Today (Demo)' : 'Today',
    };

    const updatedSkillScores = computeUpdatedSkillScoresFromAssessment(
      profile.skillScores,
      provisionalResult,
      priorForSkill
    );
    const compositeMean = calculateAverageSkillScore(updatedSkillScores);
    const summaryNote = `Academic ${draft.mode.replace('_', ' ')} in ${draft.subjectName} (${draft.scorePercent}%) updated Skill Analysis.`;

    const subjectChapters = academicChapters.filter((c) => c.subjectId === draft.subjectId);
    const subjPriorAssess = academicAssessments.filter((a) => a.subjectId === draft.subjectId);
    const allSubjAssess = [...subjPriorAssess, provisionalResult];
    const subjAvg = Math.round(
      allSubjAssess.reduce((acc, a) => acc + a.scorePercent, 0) / allSubjAssess.length
    );
    const subjWeakTopics = Array.from(new Set(allSubjAssess.flatMap((a) => a.weakTopics))).slice(
      0,
      15
    );

    setProfile((prev) => ({ ...prev, skillScores: updatedSkillScores }));

    if (isDemo) {
      setAcademicAssessments((prev) => [...prev, provisionalResult]);
      setAssessments((prev) => [
        ...prev,
        {
          id: `assess-${Date.now()}`,
          uid: profile.uid,
          overallScore: compositeMean,
          categoryScores: updatedSkillScores,
          summaryNote,
          createdAtLabel: 'Today',
        },
      ]);
      setActivity((prev) => [
        {
          id: `act-${Date.now()}`,
          uid: profile.uid,
          category: 'assessment',
          title: `${draft.subjectName}: ${draft.scorePercent}% Academic Score`,
          detail: summaryNote,
          createdAtLabel: 'Just now',
        },
        ...prev,
      ]);
      return provisionalResult;
    }

    if (firebaseUser) {
      const savedId = await saveAcademicAssessmentResult(firebaseUser.uid, draft);
      const savedRecord: AcademicAssessmentResult = {
        ...provisionalResult,
        id: savedId,
      };
      await Promise.all([
        upsertAcademicProgress(firebaseUser.uid, {
          subjectId: draft.subjectId,
          subjectName: draft.subjectName,
          linkedSkillId: draft.linkedSkillId,
          assessmentsCompleted: allSubjAssess.length,
          averageAccuracy: subjAvg,
          latestScorePercent: draft.scorePercent,
          completedChapters: subjectChapters.filter((c) => c.completed).length,
          totalChapters: subjectChapters.length,
          weakTopics: subjWeakTopics,
        }),
        updateStudentProfile(firebaseUser.uid, { skillScores: updatedSkillScores }),
        recordAssessmentSnapshot(
          firebaseUser.uid,
          compositeMean,
          updatedSkillScores,
          summaryNote
        ),
        logStudentActivity(
          firebaseUser.uid,
          'assessment',
          `${draft.subjectName}: ${draft.scorePercent}% Academic Score`,
          summaryNote
        ),
      ]);
      return savedRecord;
    }

    return provisionalResult;
  };

  const handleUpdateGoals = async (goals: LearningGoal[]) => {
    setProfile((prev) => ({ ...prev, learningGoals: goals }));
    if (mode === 'live' && firebaseUser) {
      await updateStudentProfile(firebaseUser.uid, { learningGoals: goals });
    }
  };

  const handleSaveAssessment = async (
    updatedScores: Record<SkillCategoryId, number>,
    overallScore: number,
    note: string
  ) => {
    setProfile((prev) => ({ ...prev, skillScores: updatedScores }));

    if (isDemo) {
      setAssessments((prev) => [
        ...prev,
        {
          id: `assess-${Date.now()}`,
          uid: profile.uid,
          overallScore,
          categoryScores: updatedScores,
          summaryNote: note,
          createdAtLabel: 'Today',
        },
      ]);
      setActivity((prev) => [
        {
          id: `act-${Date.now()}`,
          uid: profile.uid,
          category: 'assessment',
          title: `Diagnostic Snapshot Recorded (${overallScore}% Mean)`,
          detail: note,
          createdAtLabel: 'Just now',
        },
        ...prev,
      ]);
      return;
    }

    if (firebaseUser) {
      await updateStudentProfile(firebaseUser.uid, { skillScores: updatedScores });
      await recordAssessmentSnapshot(firebaseUser.uid, overallScore, updatedScores, note);
      await logStudentActivity(
        firebaseUser.uid,
        'assessment',
        `Diagnostic Snapshot Recorded (${overallScore}% Mean)`,
        note
      );
    }
  };

  const handleSelectCareer = async (careerId: string) => {
    const career = getCareerById(careerId);
    setProfile((prev) => ({ ...prev, selectedCareerId: career.id }));

    if (isDemo) {
      setActivity((prev) => [
        {
          id: `act-${Date.now()}`,
          uid: profile.uid,
          category: 'career',
          title: `Adopted Target Pathway: ${career.title}`,
          detail: `${career.domain} · Benchmarks recalibrated`,
          createdAtLabel: 'Just now',
        },
        ...prev,
      ]);
      return;
    }

    if (firebaseUser) {
      await updateStudentProfile(firebaseUser.uid, { selectedCareerId: career.id });
      await logStudentActivity(
        firebaseUser.uid,
        'career',
        `Adopted Target Pathway: ${career.title}`,
        `${career.domain} · Benchmarks recalibrated`
      );
    }
  };

  const handleToggleMilestone = async (
    milestoneId: string,
    milestoneTitle: string,
    nextCompleted: boolean
  ) => {
    const nextList = nextCompleted
      ? Array.from(new Set([...profile.completedMilestones, milestoneId]))
      : profile.completedMilestones.filter((id) => id !== milestoneId);

    setProfile((prev) => ({ ...prev, completedMilestones: nextList }));

    if (isDemo) {
      setActivity((prev) => [
        {
          id: `act-${Date.now()}`,
          uid: profile.uid,
          category: 'roadmap',
          title: nextCompleted
            ? `Completed Milestone: ${milestoneTitle}`
            : `Reopened Milestone: ${milestoneTitle}`,
          detail: getCareerById(profile.selectedCareerId).title,
          createdAtLabel: 'Just now',
        },
        ...prev,
      ]);
      return;
    }

    if (firebaseUser) {
      await updateStudentProfile(firebaseUser.uid, { completedMilestones: nextList });
      await logStudentActivity(
        firebaseUser.uid,
        'roadmap',
        nextCompleted
          ? `Completed Milestone: ${milestoneTitle}`
          : `Reopened Milestone: ${milestoneTitle}`,
        getCareerById(profile.selectedCareerId).title
      );
    }
  };

  const handleSaveProfile = async (patch: Partial<StudentProfile>) => {
    setProfile((prev) => ({ ...prev, ...patch }));

    if (isDemo) {
      setActivity((prev) => [
        {
          id: `act-${Date.now()}`,
          uid: profile.uid,
          category: 'profile',
          title: 'Updated Academic Profile',
          detail: 'Academic details and career interests saved in Demo Mode',
          createdAtLabel: 'Just now',
        },
        ...prev,
      ]);
      return;
    }

    if (firebaseUser) {
      await updateStudentProfile(firebaseUser.uid, patch);
      await logStudentActivity(
        firebaseUser.uid,
        'profile',
        'Updated Academic Profile',
        'Personal and academic preferences synchronized to Firestore'
      );
    }
  };

  const handlePersistMentorSession = async (
    sessionId: string | null,
    agentRole: MentorAgentRole,
    title: string,
    messages: MentorMessage[]
  ): Promise<string | null> => {
    if (isDemo) {
      const id = sessionId || `demo-session-${Date.now()}`;
      const nextSession: MentorSession = {
        id,
        uid: profile.uid,
        agentRole,
        title,
        messages,
        updatedAtLabel: 'Just now',
      };
      setMentorSessions((prev) => [
        nextSession,
        ...prev.filter((s) => s.id !== id),
      ]);
      return id;
    }

    if (firebaseUser) {
      return saveMentorSession(firebaseUser.uid, sessionId, agentRole, title, messages);
    }
    return null;
  };

  const handleDeleteMentorSession = async (sessionId: string): Promise<void> => {
    if (isDemo) {
      setMentorSessions((prev) => prev.filter((s) => s.id !== sessionId));
      return;
    }

    if (firebaseUser) {
      await deleteMentorSession(firebaseUser.uid, sessionId);
    }
  };

  const renderView = () => {
    if (mode === 'landing') {
      return (
        <LandingPage
          isAuthenticated={Boolean(firebaseUser)}
          onEnterAuth={(tab = 'signin') => {
            setAuthTab(tab);
            setMode('auth');
          }}
          onStartDemoStudent={enterDemoStudent}
          onOpenWorkspace={() => {
            if (!firebaseUser) {
              setAuthTab('signin');
              setMode('auth');
              return;
            }
            setMode('live');
          }}
        />
      );
    }

    if (mode === 'auth') {
      return (
        <AuthPortal
          initialTab={authTab}
          onBackToHome={() => setMode('landing')}
          onEnterDemoStudent={enterDemoStudent}
          onEnterDemoAdmin={enterDemoAdmin}
        />
      );
    }

    if (mode === 'live') {
      if (!authReady) {
        return (
          <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
            <div className="rounded-xl border border-[rgba(212,175,112,0.2)] bg-[#171821] px-8 py-6 text-center space-y-2">
              <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-[#D4AF70] border-t-transparent" />
              <p className="text-sm font-medium text-[#F7F3EA]">
                Verifying authenticated workspace session...
              </p>
            </div>
          </div>
        );
      }

      if (!firebaseUser) {
        return (
          <AuthPortal
            initialTab="signin"
            onBackToHome={() => setMode('landing')}
            onEnterDemoStudent={enterDemoStudent}
            onEnterDemoAdmin={enterDemoAdmin}
          />
        );
      }
    }

    return (
      <DashboardShell
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'admin' && !isAdminAuthorized) return;
          setActiveTab(tab);
        }}
        profile={profile}
        isDemo={isDemo}
        isAdminAuthorized={isAdminAuthorized}
        isSigningOut={signingOut}
        onSignOut={handleSignOut}
        onBackToHome={() => setMode('landing')}
        onSwitchToAuth={() => {
          setAuthTab('signin');
          setMode('auth');
        }}
      >
        {workspaceError && (
          <div className="mb-6 rounded-lg border border-[#8A3940] bg-[#261418] px-4 py-3 text-xs text-[#F5C2C4]">
            {workspaceError}
          </div>
        )}

        {activeTab === 'overview' && (
              <StudentOverview
                profile={profile}
                activity={activity}
                academicSummary={{
                  subjectsCount: academicSubjects.length,
                  assessmentsCount: academicAssessments.length,
                  overallAccuracy: academicInsights.overallAccuracy,
                  weakSubjectName: academicInsights.weakSubjects[0]?.subjectName,
                }}
                onNavigate={setActiveTab}
                onUpdateGoals={handleUpdateGoals}
              />
            )}
            {activeTab === 'academic' && (
              <AcademicLearningCentre
                profile={profile}
                isDemo={isDemo}
                subjects={academicSubjects}
                chapters={academicChapters}
                materials={studyMaterials}
                assessments={academicAssessments}
                plannerSessions={studySessions}
                insights={academicInsights}
                initialSection={academicInitialSection}
                onNavigateDashboardTab={setActiveTab}
                onCreateSubject={handleCreateAcademicSubject}
                onUpdateSubject={handleUpdateAcademicSubject}
                onDeleteSubject={handleDeleteAcademicSubject}
                onCreateChapter={handleCreateAcademicChapter}
                onUpdateChapter={handleUpdateAcademicChapter}
                onDeleteChapter={handleDeleteAcademicChapter}
                onCreateMaterial={handleCreateStudyMaterial}
                onDeleteMaterial={handleDeleteStudyMaterial}
                onCompleteAssessment={handleCompleteAcademicAssessment}
                onCreateSession={handleCreateStudySession}
                onToggleSession={handleToggleStudySession}
                onDeleteSession={handleDeleteStudySession}
              />
            )}
            {activeTab === 'skills' && (
              <SkillAnalysisView
                profile={profile}
                assessments={assessments}
                academicInsights={academicInsights}
                academicProgress={academicProgress}
                isDemo={isDemo}
                onOpenAcademicWeakness={() => {
                  setAcademicInitialSection('weakness');
                  setActiveTab('academic');
                }}
                onSaveAssessment={handleSaveAssessment}
              />
            )}
            {activeTab === 'careers' && (
              <CareerExplorerView
                profile={profile}
                onSelectCareer={handleSelectCareer}
              />
            )}
            {activeTab === 'roadmap' && (
              <LearningRoadmapView
                profile={profile}
                isDemo={isDemo}
                onToggleMilestone={handleToggleMilestone}
              />
            )}
            {activeTab === 'mentor' && (
              <AiMentorView
                profile={profile}
                sessions={mentorSessions}
                isDemo={isDemo}
                onPersistSession={handlePersistMentorSession}
                onDeleteSession={handleDeleteMentorSession}
              />
            )}
            {activeTab === 'profile' && (
              <ProfileSettingsView
                profile={profile}
                isDemo={isDemo}
                isAdminAuthorized={isAdminAuthorized}
                onSaveProfile={handleSaveProfile}
              />
            )}
            {activeTab === 'admin' && isAdminAuthorized && (
              <AdminDashboardView isDemo={isDemo} />
            )}
      </DashboardShell>
    );
  };

  return (
    <div className="relative min-h-screen bg-[#090A0F] text-[#F7F3EA]">
      <MidnightAtmosphere petalDensity={mode === 'landing' || mode === 'auth' ? 'editorial' : 'subtle'} />
      {renderView()}
    </div>
  );
}
