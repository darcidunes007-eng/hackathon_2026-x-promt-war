import type { User } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  CAREER_PATHWAYS,
  DEFAULT_NEW_STUDENT_GOALS,
  DEFAULT_SKILL_SCORES,
} from '../data/curriculum';
import type {
  ActivityEntry,
  AdminStudentSummary,
  MentorAgentRole,
  MentorMessage,
  MentorSession,
  SkillAssessmentRecord,
  SkillCategoryId,
  StudentProfile,
} from '../types/skillpath';
import {
  calculateOverallReadiness,
  calculateRoadmapProgress,
  clampText,
  getCareerById,
  sanitizeStudentPatch,
} from '../utils/skillAnalytics';
import { db, handleFirestoreError, OperationType } from './firebase';

function formatTimestamp(ts: unknown): string {
  if (!ts) return 'Just now';
  if (typeof ts === 'object' && ts !== null && 'toDate' in ts && typeof (ts as { toDate: () => Date }).toDate === 'function') {
    return (ts as { toDate: () => Date }).toDate().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
  return 'Recent';
}

const pendingSignupNames = new Map<string, string>();
const ensureProfileLocks = new Map<string, Promise<StudentProfile>>();

export function setPendingSignupName(email: string, displayName: string): void {
  const key = email.trim().toLowerCase();
  const cleanName = clampText(displayName, 120);
  if (key && cleanName) {
    pendingSignupNames.set(key, cleanName);
  }
}

function consumePendingSignupName(email: string | null | undefined): string | undefined {
  if (!email) return undefined;
  const key = email.trim().toLowerCase();
  const value = pendingSignupNames.get(key);
  if (value) pendingSignupNames.delete(key);
  return value;
}

export async function ensureStudentProfileFromAuth(
  user: User,
  preferredDisplayName?: string
): Promise<StudentProfile> {
  const existingLock = ensureProfileLocks.get(user.uid);
  if (existingLock) {
    return existingLock;
  }

  const pendingName = preferredDisplayName || consumePendingSignupName(user.email);

  const task = (async (): Promise<StudentProfile> => {
    const docPath = `students/${user.uid}`;
    const studentRef = doc(db, 'students', user.uid);

    let existingSnap;
    try {
      existingSnap = await getDoc(studentRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, docPath);
    }

    if (existingSnap.exists()) {
      const data = existingSnap.data() as StudentProfile;
      const needsPhotoSync = !data.photoURL && Boolean(user.photoURL);
      const needsNameSync = !data.displayName && Boolean(pendingName || user.displayName);

      if (needsPhotoSync || needsNameSync) {
        const patch = sanitizeStudentPatch({
          displayName: data.displayName || pendingName || user.displayName || 'Student Scholar',
          photoURL: data.photoURL || user.photoURL || '',
        });
        try {
          await updateDoc(studentRef, {
            ...patch,
            updatedAt: serverTimestamp(),
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, docPath);
        }
        return { ...data, ...patch };
      }

      return data;
    }

    const resolvedName = clampText(
      pendingName || user.displayName || user.email?.split('@')[0] || 'Student Scholar',
      120
    );

    const initialProfile = {
      uid: user.uid,
      displayName: resolvedName,
      email: clampText(user.email || '', 254),
      photoURL: clampText(user.photoURL || '', 1024),
      role: 'student' as const,
      academicTrack: 'Undergraduate / Graduate Scholar',
      institution: 'University Partner',
      graduationYear: 2027,
      careerInterests: ['AI Systems', 'Software Architecture'],
      selectedCareerId: CAREER_PATHWAYS[0].id,
      skillScores: { ...DEFAULT_SKILL_SCORES },
      completedMilestones: [],
      learningGoals: DEFAULT_NEW_STUDENT_GOALS,
      weeklyStudyHours: 10,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(studentRef, initialProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, docPath);
    }

    return {
      ...initialProfile,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  })();

  ensureProfileLocks.set(user.uid, task);
  try {
    return await task;
  } finally {
    ensureProfileLocks.delete(user.uid);
  }
}

export async function updateStudentProfile(
  uid: string,
  patch: Partial<StudentProfile>
): Promise<void> {
  const docPath = `students/${uid}`;
  const sanitized = sanitizeStudentPatch(patch);
  try {
    await updateDoc(doc(db, 'students', uid), {
      ...sanitized,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function recordAssessmentSnapshot(
  uid: string,
  overallScore: number,
  categoryScores: Record<SkillCategoryId, number>,
  summaryNote: string
): Promise<void> {
  const colPath = `students/${uid}/assessments`;
  try {
    await addDoc(collection(db, 'students', uid, 'assessments'), {
      uid,
      overallScore: Math.max(0, Math.min(100, Math.round(overallScore))),
      categoryScores,
      summaryNote: clampText(summaryNote, 600, 'Skill diagnostic snapshot'),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, colPath);
  }
}

export async function logStudentActivity(
  uid: string,
  category: ActivityEntry['category'],
  title: string,
  detail: string
): Promise<void> {
  const colPath = `students/${uid}/activity`;
  try {
    await addDoc(collection(db, 'students', uid, 'activity'), {
      uid,
      category,
      title: clampText(title, 160),
      detail: clampText(detail, 400),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, colPath);
  }
}

export async function saveMentorSession(
  uid: string,
  sessionId: string | null,
  agentRole: MentorAgentRole,
  title: string,
  messages: MentorMessage[]
): Promise<string> {
  const boundedMessages = messages.slice(-50).map((m) => ({
    id: clampText(m.id, 64),
    sender: m.sender,
    agentRole: m.agentRole ?? null,
    agentLabel: m.agentLabel ? clampText(m.agentLabel, 60) : null,
    coordinationSummary: m.coordinationSummary ? clampText(m.coordinationSummary, 300) : null,
    content: clampText(m.content, 4000),
    actionableSteps: (m.actionableSteps ?? []).slice(0, 4).map((s) => clampText(s, 300)),
    followUpQuestions: (m.followUpQuestions ?? []).slice(0, 3).map((q) => clampText(q, 200)),
    timestamp: clampText(m.timestamp, 40),
  }));

  const safeTitle = clampText(title, 160) || 'Mentor Consultation';

  if (sessionId) {
    const docPath = `students/${uid}/mentorSessions/${sessionId}`;
    try {
      await updateDoc(doc(db, 'students', uid, 'mentorSessions', sessionId), {
        agentRole,
        title: safeTitle,
        messages: boundedMessages,
        updatedAt: serverTimestamp(),
      });
      return sessionId;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, docPath);
    }
  }

  const colPath = `students/${uid}/mentorSessions`;
  try {
    const ref = await addDoc(collection(db, 'students', uid, 'mentorSessions'), {
      uid,
      agentRole,
      title: safeTitle,
      messages: boundedMessages,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, colPath);
  }
}

export async function deleteMentorSession(uid: string, sessionId: string): Promise<void> {
  const docPath = `students/${uid}/mentorSessions/${sessionId}`;
  try {
    await deleteDoc(doc(db, 'students', uid, 'mentorSessions', sessionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export function formatFirestoreUserMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  try {
    const parsed = JSON.parse(raw) as { error?: string; path?: string; operationType?: string };
    if (parsed?.error) {
      if (parsed.error.toLowerCase().includes('permission')) {
        return `Firestore permission denied while performing ${parsed.operationType || 'database access'} on ${parsed.path || 'your workspace'}. Verify you are signed in with the owning account.`;
      }
      return parsed.error;
    }
  } catch {
    // Plain string message
  }
  return raw;
}

export function subscribeToStudentWorkspace(
  uid: string,
  callbacks: {
    onProfile: (profile: StudentProfile) => void;
    onAssessments: (records: SkillAssessmentRecord[]) => void;
    onActivity: (entries: ActivityEntry[]) => void;
    onSessions: (sessions: MentorSession[]) => void;
    onError: (err: Error) => void;
  }
): Unsubscribe {
  const unsubProfile = onSnapshot(
    doc(db, 'students', uid),
    (snap) => {
      if (snap.exists()) {
        callbacks.onProfile(snap.data() as StudentProfile);
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, `students/${uid}`);
      } catch (wrapped) {
        callbacks.onError(wrapped as Error);
      }
    }
  );

  const assessmentsQ = query(
    collection(db, 'students', uid, 'assessments'),
    orderBy('createdAt', 'asc'),
    limit(15)
  );
  const unsubAssessments = onSnapshot(
    assessmentsQ,
    (snap) => {
      const records: SkillAssessmentRecord[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          uid: data.uid,
          overallScore: data.overallScore,
          categoryScores: data.categoryScores,
          summaryNote: data.summaryNote ?? '',
          createdAtLabel: formatTimestamp(data.createdAt),
        };
      });
      callbacks.onAssessments(records);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, `students/${uid}/assessments`);
      } catch (wrapped) {
        callbacks.onError(wrapped as Error);
      }
    }
  );

  const activityQ = query(
    collection(db, 'students', uid, 'activity'),
    orderBy('createdAt', 'desc'),
    limit(15)
  );
  const unsubActivity = onSnapshot(
    activityQ,
    (snap) => {
      const entries: ActivityEntry[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          uid: data.uid,
          category: data.category,
          title: data.title,
          detail: data.detail ?? '',
          createdAtLabel: formatTimestamp(data.createdAt),
        };
      });
      callbacks.onActivity(entries);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, `students/${uid}/activity`);
      } catch (wrapped) {
        callbacks.onError(wrapped as Error);
      }
    }
  );

  const sessionsQ = query(
    collection(db, 'students', uid, 'mentorSessions'),
    orderBy('updatedAt', 'desc'),
    limit(12)
  );
  const unsubSessions = onSnapshot(
    sessionsQ,
    (snap) => {
      const list: MentorSession[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          uid: data.uid,
          agentRole: data.agentRole,
          title: data.title,
          messages: Array.isArray(data.messages) ? data.messages : [],
          updatedAtLabel: formatTimestamp(data.updatedAt),
        };
      });
      callbacks.onSessions(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, `students/${uid}/mentorSessions`);
      } catch (wrapped) {
        callbacks.onError(wrapped as Error);
      }
    }
  );

  return () => {
    unsubProfile();
    unsubAssessments();
    unsubActivity();
    unsubSessions();
  };
}

export async function fetchAllStudentsForAdmin(): Promise<AdminStudentSummary[]> {
  try {
    const snap = await getDocs(query(collection(db, 'students'), limit(100)));
    return snap.docs.map((d) => {
      const profile = d.data() as StudentProfile;
      const career = getCareerById(profile.selectedCareerId);
      const readinessScore = calculateOverallReadiness(
        profile.skillScores ?? DEFAULT_SKILL_SCORES,
        career
      );
      const roadmap = calculateRoadmapProgress(profile.completedMilestones ?? [], career);
      return {
        uid: profile.uid,
        displayName: profile.displayName,
        email: profile.email,
        role: profile.role,
        academicTrack: profile.academicTrack || 'Unspecified',
        institution: profile.institution || 'Partner University',
        selectedCareerTitle: career.title,
        readinessScore,
        roadmapPercent: roadmap.percentage,
        weeklyStudyHours: profile.weeklyStudyHours ?? 0,
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'students');
  }
}

export async function verifyServerAdminSession(user: User): Promise<boolean> {
  try {
    const idToken = await user.getIdToken();
    const res = await fetch('/api/auth/verify-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { authorized?: boolean };
    return Boolean(data.authorized);
  } catch {
    return false;
  }
}
