import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import type {
  AcademicAssessmentResult,
  AcademicChapter,
  AcademicProgressSummary,
  AcademicSubject,
  StudyMaterialItem,
  StudyPlannerSession,
} from '../types/skillpath';
import { clampText } from '../utils/skillAnalytics';
import { db, handleFirestoreError, OperationType } from './firebase';

function formatDocDate(ts: unknown): string {
  if (!ts) return 'Just now';
  if (
    typeof ts === 'object' &&
    ts !== null &&
    'toDate' in ts &&
    typeof (ts as { toDate: () => Date }).toDate === 'function'
  ) {
    return (ts as { toDate: () => Date }).toDate().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
  return 'Recent';
}

function clampStringArray(items: string[] | undefined, maxCount: number, maxLen: number): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((s) => clampText(s, maxLen))
    .filter(Boolean)
    .slice(0, maxCount);
}

export async function createAcademicSubject(
  uid: string,
  input: Omit<AcademicSubject, 'id' | 'uid' | 'isDemo' | 'createdAtLabel'>
): Promise<string> {
  const colPath = `students/${uid}/subjects`;
  try {
    const ref = await addDoc(collection(db, 'students', uid, 'subjects'), {
      uid,
      name: clampText(input.name, 140) || 'Untitled Subject',
      category: clampText(input.category, 60) || 'Other',
      description: clampText(input.description, 600),
      linkedSkillId: input.linkedSkillId,
      examDate: clampText(input.examDate ?? '', 32),
      targetGrade: clampText(input.targetGrade ?? '', 24),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, colPath);
  }
}

export async function updateAcademicSubject(
  uid: string,
  subjectId: string,
  patch: Partial<
    Pick<
      AcademicSubject,
      'name' | 'category' | 'description' | 'linkedSkillId' | 'examDate' | 'targetGrade'
    >
  >
): Promise<void> {
  const docPath = `students/${uid}/subjects/${subjectId}`;
  const cleanPatch: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (patch.name !== undefined) cleanPatch.name = clampText(patch.name, 140) || 'Subject';
  if (patch.category !== undefined) cleanPatch.category = clampText(patch.category, 60);
  if (patch.description !== undefined) cleanPatch.description = clampText(patch.description, 600);
  if (patch.linkedSkillId !== undefined) cleanPatch.linkedSkillId = patch.linkedSkillId;
  if (patch.examDate !== undefined) cleanPatch.examDate = clampText(patch.examDate, 32);
  if (patch.targetGrade !== undefined) cleanPatch.targetGrade = clampText(patch.targetGrade, 24);

  try {
    await updateDoc(doc(db, 'students', uid, 'subjects', subjectId), cleanPatch);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function deleteAcademicSubject(uid: string, subjectId: string): Promise<void> {
  const docPath = `students/${uid}/subjects/${subjectId}`;
  try {
    await deleteDoc(doc(db, 'students', uid, 'subjects', subjectId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export async function createAcademicChapter(
  uid: string,
  subjectId: string,
  input: Omit<AcademicChapter, 'id' | 'uid' | 'subjectId'>
): Promise<string> {
  const colPath = `students/${uid}/subjects/${subjectId}/chapters`;
  try {
    const ref = await addDoc(collection(db, 'students', uid, 'subjects', subjectId, 'chapters'), {
      uid,
      subjectId,
      orderIndex: Math.max(1, Math.min(200, Math.round(input.orderIndex || 1))),
      title: clampText(input.title, 180) || 'Untitled Chapter',
      topics: clampStringArray(input.topics, 25, 120),
      learningObjectives: clampStringArray(input.learningObjectives, 20, 220),
      importantConcepts: clampStringArray(input.importantConcepts, 25, 220),
      completed: Boolean(input.completed),
      estimatedHours: Math.max(0, Math.min(100, Number(input.estimatedHours) || 2)),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, colPath);
  }
}

export async function updateAcademicChapter(
  uid: string,
  subjectId: string,
  chapterId: string,
  patch: Partial<
    Pick<
      AcademicChapter,
      'orderIndex' | 'title' | 'topics' | 'learningObjectives' | 'importantConcepts' | 'completed' | 'estimatedHours'
    >
  >
): Promise<void> {
  const docPath = `students/${uid}/subjects/${subjectId}/chapters/${chapterId}`;
  const clean: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (patch.orderIndex !== undefined) {
    clean.orderIndex = Math.max(1, Math.min(200, Math.round(patch.orderIndex)));
  }
  if (patch.title !== undefined) clean.title = clampText(patch.title, 180) || 'Chapter';
  if (patch.topics !== undefined) clean.topics = clampStringArray(patch.topics, 25, 120);
  if (patch.learningObjectives !== undefined) {
    clean.learningObjectives = clampStringArray(patch.learningObjectives, 20, 220);
  }
  if (patch.importantConcepts !== undefined) {
    clean.importantConcepts = clampStringArray(patch.importantConcepts, 25, 220);
  }
  if (patch.completed !== undefined) clean.completed = Boolean(patch.completed);
  if (patch.estimatedHours !== undefined) {
    clean.estimatedHours = Math.max(0, Math.min(100, Number(patch.estimatedHours) || 0));
  }

  try {
    await updateDoc(doc(db, 'students', uid, 'subjects', subjectId, 'chapters', chapterId), clean);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function deleteAcademicChapter(
  uid: string,
  subjectId: string,
  chapterId: string
): Promise<void> {
  const docPath = `students/${uid}/subjects/${subjectId}/chapters/${chapterId}`;
  try {
    await deleteDoc(doc(db, 'students', uid, 'subjects', subjectId, 'chapters', chapterId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export async function createStudyMaterial(
  uid: string,
  input: Omit<StudyMaterialItem, 'id' | 'uid' | 'createdAtLabel'>
): Promise<string> {
  const colPath = `students/${uid}/studyMaterials`;
  const payload: Record<string, unknown> = {
    uid,
    subjectId: input.subjectId,
    topic: clampText(input.topic, 140) || 'General Topic',
    title: clampText(input.title, 180) || 'Study Material',
    format: clampText(input.format, 60) || 'Detailed Notes',
    level: clampText(input.level, 40) || 'Intermediate',
    content: clampText(input.content, 20000) || 'Empty material',
    sourceType: input.sourceType,
    createdAt: serverTimestamp(),
  };

  if (input.chapterId) payload.chapterId = clampText(input.chapterId, 128);
  if (input.externalUrl) payload.externalUrl = clampText(input.externalUrl, 1024);
  if (input.fileName) payload.fileName = clampText(input.fileName, 200);
  if (typeof input.fileSizeBytes === 'number' && input.fileSizeBytes >= 0) {
    payload.fileSizeBytes = Math.min(204800, Math.round(input.fileSizeBytes));
  }
  if (input.aiDisclaimer) payload.aiDisclaimer = clampText(input.aiDisclaimer, 400);

  try {
    const ref = await addDoc(collection(db, 'students', uid, 'studyMaterials'), payload);
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, colPath);
  }
}

export async function deleteStudyMaterial(uid: string, materialId: string): Promise<void> {
  const docPath = `students/${uid}/studyMaterials/${materialId}`;
  try {
    await deleteDoc(doc(db, 'students', uid, 'studyMaterials', materialId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export async function saveAcademicAssessmentResult(
  uid: string,
  result: Omit<AcademicAssessmentResult, 'id' | 'uid' | 'createdAtLabel'>
): Promise<string> {
  const colPath = `students/${uid}/academicAssessments`;
  const boundedReviews = result.reviews.slice(0, 50).map((r) => ({
    questionId: clampText(r.questionId, 64),
    prompt: clampText(r.prompt, 500),
    type: r.type,
    topic: clampText(r.topic, 140),
    difficulty: r.difficulty,
    userAnswerLabel: clampText(r.userAnswerLabel, 800),
    expectedAnswerLabel: clampText(r.expectedAnswerLabel, 800),
    isCorrect: Boolean(r.isCorrect),
    needsHumanReview: Boolean(r.needsHumanReview),
    scoreRatio: Math.max(0, Math.min(1, Number(r.scoreRatio) || 0)),
    feedback: clampText(r.feedback, 500),
    explanation: clampText(r.explanation, 800),
  }));

  const payload: Record<string, unknown> = {
    uid,
    subjectId: result.subjectId,
    subjectName: clampText(result.subjectName, 140),
    linkedSkillId: result.linkedSkillId,
    mode: result.mode,
    difficulty: result.difficulty,
    totalQuestions: Math.max(1, Math.min(50, result.totalQuestions)),
    correctCount: Math.max(0, Math.min(result.totalQuestions, result.correctCount)),
    scorePercent: Math.max(0, Math.min(100, Math.round(result.scorePercent))),
    durationMinutes: Math.max(0, Math.min(300, Math.round(result.durationMinutes))),
    requiresHumanReview: Boolean(result.requiresHumanReview),
    weakTopics: clampStringArray(result.weakTopics, 25, 140),
    reviews: boundedReviews,
    createdAt: serverTimestamp(),
  };

  if (result.chapterId) payload.chapterId = clampText(result.chapterId, 128);
  if (result.chapterTitle) payload.chapterTitle = clampText(result.chapterTitle, 180);

  try {
    const ref = await addDoc(collection(db, 'students', uid, 'academicAssessments'), payload);
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, colPath);
  }
}

export async function upsertAcademicProgress(
  uid: string,
  progress: Omit<AcademicProgressSummary, 'id' | 'uid' | 'updatedAtLabel'>
): Promise<void> {
  const docPath = `students/${uid}/academicProgress/${progress.subjectId}`;
  const docRef = doc(db, 'students', uid, 'academicProgress', progress.subjectId);
  const payload = {
    uid,
    subjectId: progress.subjectId,
    subjectName: clampText(progress.subjectName, 140),
    linkedSkillId: progress.linkedSkillId,
    assessmentsCompleted: Math.max(0, Math.round(progress.assessmentsCompleted)),
    averageAccuracy: Math.max(0, Math.min(100, Math.round(progress.averageAccuracy))),
    latestScorePercent: Math.max(0, Math.min(100, Math.round(progress.latestScorePercent))),
    completedChapters: Math.max(0, Math.round(progress.completedChapters)),
    totalChapters: Math.max(0, Math.round(progress.totalChapters)),
    weakTopics: clampStringArray(progress.weakTopics, 25, 140),
    updatedAt: serverTimestamp(),
  };

  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      await updateDoc(docRef, {
        subjectName: payload.subjectName,
        linkedSkillId: payload.linkedSkillId,
        assessmentsCompleted: payload.assessmentsCompleted,
        averageAccuracy: payload.averageAccuracy,
        latestScorePercent: payload.latestScorePercent,
        completedChapters: payload.completedChapters,
        totalChapters: payload.totalChapters,
        weakTopics: payload.weakTopics,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, payload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function createStudySession(
  uid: string,
  input: Omit<StudyPlannerSession, 'id' | 'uid'>
): Promise<string> {
  const colPath = `students/${uid}/studySessions`;
  const payload: Record<string, unknown> = {
    uid,
    subjectId: input.subjectId,
    subjectName: clampText(input.subjectName, 140),
    title: clampText(input.title, 180) || 'Study Session',
    sessionType: input.sessionType,
    scheduledDate: clampText(input.scheduledDate, 32),
    durationMinutes: Math.max(5, Math.min(480, Math.round(input.durationMinutes || 30))),
    completed: Boolean(input.completed),
    priority: input.priority,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (input.chapterId) payload.chapterId = clampText(input.chapterId, 128);
  if (input.chapterTitle) payload.chapterTitle = clampText(input.chapterTitle, 180);

  try {
    const ref = await addDoc(collection(db, 'students', uid, 'studySessions'), payload);
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, colPath);
  }
}

export async function updateStudySession(
  uid: string,
  sessionId: string,
  patch: Partial<
    Pick<
      StudyPlannerSession,
      'title' | 'sessionType' | 'scheduledDate' | 'durationMinutes' | 'completed' | 'priority'
    >
  >
): Promise<void> {
  const docPath = `students/${uid}/studySessions/${sessionId}`;
  const clean: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (patch.title !== undefined) clean.title = clampText(patch.title, 180);
  if (patch.sessionType !== undefined) clean.sessionType = patch.sessionType;
  if (patch.scheduledDate !== undefined) clean.scheduledDate = clampText(patch.scheduledDate, 32);
  if (patch.durationMinutes !== undefined) {
    clean.durationMinutes = Math.max(5, Math.min(480, Math.round(patch.durationMinutes)));
  }
  if (patch.completed !== undefined) clean.completed = Boolean(patch.completed);
  if (patch.priority !== undefined) clean.priority = patch.priority;

  try {
    await updateDoc(doc(db, 'students', uid, 'studySessions', sessionId), clean);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function deleteStudySession(uid: string, sessionId: string): Promise<void> {
  const docPath = `students/${uid}/studySessions/${sessionId}`;
  try {
    await deleteDoc(doc(db, 'students', uid, 'studySessions', sessionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export function subscribeToAcademicWorkspace(
  uid: string,
  callbacks: {
    onSubjects: (subjects: AcademicSubject[]) => void;
    onChapters: (chapters: AcademicChapter[]) => void;
    onMaterials: (materials: StudyMaterialItem[]) => void;
    onAssessments: (assessments: AcademicAssessmentResult[]) => void;
    onSessions: (sessions: StudyPlannerSession[]) => void;
    onProgress: (progress: AcademicProgressSummary[]) => void;
    onError: (err: Error) => void;
  }
): Unsubscribe {
  const chapterUnsubs = new Map<string, Unsubscribe>();
  const chaptersBySubject = new Map<string, AcademicChapter[]>();

  const emitMergedChapters = () => {
    const merged: AcademicChapter[] = [];
    for (const list of chaptersBySubject.values()) {
      merged.push(...list);
    }
    merged.sort((a, b) => a.orderIndex - b.orderIndex);
    callbacks.onChapters(merged);
  };

  const syncSubjectChapterListeners = (subjectIds: string[]) => {
    const activeSet = new Set(subjectIds);
    for (const [id, unsub] of chapterUnsubs.entries()) {
      if (!activeSet.has(id)) {
        unsub();
        chapterUnsubs.delete(id);
        chaptersBySubject.delete(id);
      }
    }

    for (const subjId of subjectIds) {
      if (chapterUnsubs.has(subjId)) continue;
      const q = query(
        collection(db, 'students', uid, 'subjects', subjId, 'chapters'),
        orderBy('orderIndex', 'asc'),
        limit(50)
      );
      const unsub = onSnapshot(
        q,
        (snap) => {
          const list: AcademicChapter[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              uid: data.uid,
              subjectId: subjId,
              orderIndex: Number(data.orderIndex) || 1,
              title: data.title,
              topics: Array.isArray(data.topics) ? data.topics : [],
              learningObjectives: Array.isArray(data.learningObjectives)
                ? data.learningObjectives
                : [],
              importantConcepts: Array.isArray(data.importantConcepts)
                ? data.importantConcepts
                : [],
              completed: Boolean(data.completed),
              estimatedHours: Number(data.estimatedHours) || 2,
            };
          });
          chaptersBySubject.set(subjId, list);
          emitMergedChapters();
        },
        (error) => {
          try {
            handleFirestoreError(error, OperationType.LIST, `students/${uid}/subjects/${subjId}/chapters`);
          } catch (wrapped) {
            callbacks.onError(wrapped as Error);
          }
        }
      );
      chapterUnsubs.set(subjId, unsub);
    }
    emitMergedChapters();
  };

  const unsubSubjects = onSnapshot(
    query(collection(db, 'students', uid, 'subjects'), orderBy('createdAt', 'asc'), limit(40)),
    (snap) => {
      const list: AcademicSubject[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          uid: data.uid,
          name: data.name,
          category: data.category,
          description: data.description ?? '',
          linkedSkillId: data.linkedSkillId,
          examDate: data.examDate ?? '',
          targetGrade: data.targetGrade ?? '',
          isDemo: false,
          createdAtLabel: formatDocDate(data.createdAt),
        };
      });
      callbacks.onSubjects(list);
      syncSubjectChapterListeners(list.map((s) => s.id));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, `students/${uid}/subjects`);
      } catch (wrapped) {
        callbacks.onError(wrapped as Error);
      }
    }
  );

  const unsubMaterials = onSnapshot(
    query(collection(db, 'students', uid, 'studyMaterials'), orderBy('createdAt', 'desc'), limit(60)),
    (snap) => {
      const list: StudyMaterialItem[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          uid: data.uid,
          subjectId: data.subjectId,
          chapterId: data.chapterId,
          topic: data.topic,
          title: data.title,
          format: data.format,
          level: data.level,
          content: data.content,
          externalUrl: data.externalUrl,
          fileName: data.fileName,
          fileSizeBytes: data.fileSizeBytes,
          sourceType: data.sourceType,
          aiDisclaimer: data.aiDisclaimer,
          createdAtLabel: formatDocDate(data.createdAt),
        };
      });
      callbacks.onMaterials(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, `students/${uid}/studyMaterials`);
      } catch (wrapped) {
        callbacks.onError(wrapped as Error);
      }
    }
  );

  const unsubAssessments = onSnapshot(
    query(
      collection(db, 'students', uid, 'academicAssessments'),
      orderBy('createdAt', 'asc'),
      limit(50)
    ),
    (snap) => {
      const list: AcademicAssessmentResult[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          uid: data.uid,
          subjectId: data.subjectId,
          subjectName: data.subjectName,
          chapterId: data.chapterId,
          chapterTitle: data.chapterTitle,
          linkedSkillId: data.linkedSkillId,
          mode: data.mode,
          difficulty: data.difficulty,
          totalQuestions: data.totalQuestions,
          correctCount: data.correctCount,
          scorePercent: data.scorePercent,
          durationMinutes: data.durationMinutes,
          requiresHumanReview: Boolean(data.requiresHumanReview),
          weakTopics: Array.isArray(data.weakTopics) ? data.weakTopics : [],
          reviews: Array.isArray(data.reviews) ? data.reviews : [],
          createdAtLabel: formatDocDate(data.createdAt),
        };
      });
      callbacks.onAssessments(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, `students/${uid}/academicAssessments`);
      } catch (wrapped) {
        callbacks.onError(wrapped as Error);
      }
    }
  );

  const unsubSessions = onSnapshot(
    query(collection(db, 'students', uid, 'studySessions'), orderBy('scheduledDate', 'asc'), limit(60)),
    (snap) => {
      const list: StudyPlannerSession[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          uid: data.uid,
          subjectId: data.subjectId,
          subjectName: data.subjectName,
          chapterId: data.chapterId,
          chapterTitle: data.chapterTitle,
          title: data.title,
          sessionType: data.sessionType,
          scheduledDate: data.scheduledDate,
          durationMinutes: Number(data.durationMinutes) || 30,
          completed: Boolean(data.completed),
          priority: data.priority === 'recommended' ? 'recommended' : 'standard',
        };
      });
      callbacks.onSessions(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, `students/${uid}/studySessions`);
      } catch (wrapped) {
        callbacks.onError(wrapped as Error);
      }
    }
  );

  const unsubProgress = onSnapshot(
    query(collection(db, 'students', uid, 'academicProgress'), limit(40)),
    (snap) => {
      const list: AcademicProgressSummary[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          uid: data.uid,
          subjectId: data.subjectId,
          subjectName: data.subjectName,
          linkedSkillId: data.linkedSkillId,
          assessmentsCompleted: Number(data.assessmentsCompleted) || 0,
          averageAccuracy: Number(data.averageAccuracy) || 0,
          latestScorePercent: Number(data.latestScorePercent) || 0,
          completedChapters: Number(data.completedChapters) || 0,
          totalChapters: Number(data.totalChapters) || 0,
          weakTopics: Array.isArray(data.weakTopics) ? data.weakTopics : [],
          updatedAtLabel: formatDocDate(data.updatedAt),
        };
      });
      callbacks.onProgress(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, `students/${uid}/academicProgress`);
      } catch (wrapped) {
        callbacks.onError(wrapped as Error);
      }
    }
  );

  return () => {
    unsubSubjects();
    unsubMaterials();
    unsubAssessments();
    unsubSessions();
    unsubProgress();
    for (const unsub of chapterUnsubs.values()) {
      unsub();
    }
    chapterUnsubs.clear();
  };
}
