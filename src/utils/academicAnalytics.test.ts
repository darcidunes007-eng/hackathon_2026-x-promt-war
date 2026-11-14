import test from 'node:test';
import assert from 'node:assert/strict';
import type {
  AcademicChapter,
  AcademicQuestion,
  AcademicSubject,
  SkillCategoryId,
} from '../types/skillpath.ts';
import {
  computeAcademicInsights,
  computeUpdatedSkillScoresFromAssessment,
  gradeAcademicAssessment,
  validateStudyMaterialFile,
} from './academicAnalytics.ts';

const mathSubject: AcademicSubject = {
  id: 'subj-math',
  uid: 'u1',
  name: 'Linear Algebra',
  category: 'Mathematics',
  description: 'Vector spaces and eigenvalues',
  linkedSkillId: 'quantitative_literacy',
};

const physicsSubject: AcademicSubject = {
  id: 'subj-physics',
  uid: 'u1',
  name: 'Classical Mechanics & Electromagnetism',
  category: 'Physics',
  description: 'Newtonian and Maxwell equations',
  linkedSkillId: 'systems_architecture',
};

const chapters: AcademicChapter[] = [
  {
    id: 'ch-math-1',
    uid: 'u1',
    subjectId: 'subj-math',
    orderIndex: 1,
    title: 'Eigenvalues & Spectral Theorem',
    topics: ['Characteristic polynomial', 'Diagonalization'],
    learningObjectives: ['Compute eigenvalues'],
    importantConcepts: ['Symmetric matrices have real eigenvalues'],
    completed: true,
    estimatedHours: 4,
  },
  {
    id: 'ch-phys-1',
    uid: 'u1',
    subjectId: 'subj-physics',
    orderIndex: 1,
    title: 'Gauss Law & Flux Integrals',
    topics: ['Electric flux', 'Gaussian surfaces'],
    learningObjectives: ['Apply Gauss Law'],
    importantConcepts: ['Enclosed charge'],
    completed: false,
    estimatedHours: 5,
  },
];

const sampleQuestions: AcademicQuestion[] = [
  {
    id: 'q1',
    type: 'mcq',
    topic: 'Characteristic polynomial',
    difficulty: 'Intermediate',
    prompt: 'What is the trace of a 2x2 matrix equal to?',
    options: ['Product of eigenvalues', 'Sum of eigenvalues', 'Determinant', 'Zero'],
    correctOptionIndex: 1,
    explanation: 'The trace equals the sum of eigenvalues.',
  },
  {
    id: 'q2',
    type: 'multiple_select',
    topic: 'Diagonalization',
    difficulty: 'Advanced',
    prompt: 'Select properties guaranteed for real symmetric matrices.',
    options: [
      'Real eigenvalues',
      'Always invertible',
      'Orthogonal eigenvectors for distinct eigenvalues',
    ],
    correctOptionIndices: [0, 2],
    explanation: 'Real symmetric matrices are always orthogonally diagonalizable.',
  },
  {
    id: 'q3',
    type: 'numerical',
    topic: 'Eigenvalues',
    difficulty: 'Beginner',
    prompt: 'What is the determinant of diag(3, 4)?',
    correctNumericalAnswer: 12,
    numericalTolerance: 0.01,
    explanation: '3 * 4 = 12.',
  },
];

test('gradeAcademicAssessment accurately grades MCQ, Multiple Select, and Numerical questions', () => {
  const result = gradeAcademicAssessment({
    id: 'res-1',
    uid: 'u1',
    subject: mathSubject,
    chapter: chapters[0],
    mode: 'chapter_test',
    difficulty: 'Intermediate',
    durationMinutes: 10,
    questions: sampleQuestions,
    answers: {
      q1: { selectedIndex: 1 }, // correct
      q2: { selectedIndices: [0, 2] }, // correct
      q3: { numericalAnswer: '12' }, // correct
    },
  });

  assert.equal(result.correctCount, 3);
  assert.equal(result.scorePercent, 100);
  assert.equal(result.requiresHumanReview, false);
  assert.deepEqual(result.weakTopics, []);
});

test('gradeAcademicAssessment flags missed topics and subjective human review accurately', () => {
  const mixedQuestions: AcademicQuestion[] = [
    ...sampleQuestions,
    {
      id: 'q4',
      type: 'short_answer',
      topic: 'Electric flux',
      difficulty: 'Intermediate',
      prompt: 'Explain Gauss law.',
      keyPoints: ['flux', 'enclosed charge'],
      referenceAnswer: 'Total electric flux equals enclosed charge divided by epsilon_0.',
      explanation: 'Relates surface flux to enclosed charge.',
    },
  ];

  const result = gradeAcademicAssessment({
    id: 'res-2',
    uid: 'u1',
    subject: physicsSubject,
    chapter: chapters[1],
    mode: 'chapter_test',
    difficulty: 'Intermediate',
    durationMinutes: 12,
    questions: mixedQuestions,
    answers: {
      q1: { selectedIndex: 0 }, // wrong
      q2: { selectedIndices: [0] }, // wrong (partial selection)
      q3: { numericalAnswer: '99' }, // wrong
      q4: { textAnswer: 'I am not sure.' }, // wrong
    },
  });

  assert.equal(result.correctCount, 0);
  assert.equal(result.scorePercent, 0);
  assert.equal(result.requiresHumanReview, true);
  assert.ok(result.weakTopics.includes('Characteristic polynomial'));
  assert.ok(result.weakTopics.includes('Electric flux'));
});

test('computeUpdatedSkillScoresFromAssessment integrates real scores into target skill pillar only', () => {
  const baseline: Record<SkillCategoryId, number> = {
    systems_architecture: 60,
    applied_ml: 70,
    algorithmic_reasoning: 75,
    fullstack_engineering: 80,
    quantitative_literacy: 60,
    technical_communication: 72,
  };

  const highMathResult = gradeAcademicAssessment({
    id: 'res-math',
    uid: 'u1',
    subject: mathSubject,
    mode: 'subject_test',
    difficulty: 'Intermediate',
    durationMinutes: 15,
    questions: sampleQuestions,
    answers: {
      q1: { selectedIndex: 1 },
      q2: { selectedIndices: [0, 2] },
      q3: { numericalAnswer: '12' },
    },
  });

  const updated = computeUpdatedSkillScoresFromAssessment(baseline, highMathResult, []);
  // 100 * 0.6 + 60 * 0.4 = 84
  assert.equal(updated.quantitative_literacy, 84);
  assert.equal(updated.systems_architecture, 60);
});

test('computeAcademicInsights distinguishes strong vs weak subjects and generates targeted recommendations', () => {
  const mathPass = gradeAcademicAssessment({
    id: 'a-math',
    uid: 'u1',
    subject: mathSubject,
    chapter: chapters[0],
    mode: 'chapter_test',
    difficulty: 'Intermediate',
    durationMinutes: 10,
    questions: sampleQuestions,
    answers: {
      q1: { selectedIndex: 1 },
      q2: { selectedIndices: [0, 2] },
      q3: { numericalAnswer: '12' },
    },
  });

  const physFail = gradeAcademicAssessment({
    id: 'a-phys',
    uid: 'u1',
    subject: physicsSubject,
    chapter: chapters[1],
    mode: 'chapter_test',
    difficulty: 'Intermediate',
    durationMinutes: 10,
    questions: sampleQuestions,
    answers: {
      q1: { selectedIndex: 0 },
      q2: { selectedIndices: [0] },
      q3: { numericalAnswer: '5' },
    },
  });

  const insights = computeAcademicInsights({
    subjects: [mathSubject, physicsSubject],
    chapters,
    assessments: [mathPass, physFail],
    materials: [],
    plannerSessions: [
      {
        id: 's1',
        uid: 'u1',
        subjectId: 'subj-physics',
        subjectName: physicsSubject.name,
        title: 'Revise Gauss Law',
        sessionType: 'revision',
        scheduledDate: '2026-11-15',
        durationMinutes: 45,
        completed: true,
        priority: 'recommended',
      },
      {
        id: 's2',
        uid: 'u1',
        subjectId: 'subj-physics',
        subjectName: physicsSubject.name,
        title: 'Practice flux problems',
        sessionType: 'practice',
        scheduledDate: '2026-11-16',
        durationMinutes: 45,
        completed: false,
        priority: 'recommended',
      },
    ],
  });

  assert.equal(insights.strongSubjects.length, 1);
  assert.equal(insights.strongSubjects[0].subjectName, 'Linear Algebra');
  assert.equal(insights.weakSubjects.length, 1);
  assert.equal(insights.weakSubjects[0].subjectName, 'Classical Mechanics & Electromagnetism');
  assert.equal(insights.difficultChapters.length, 1);
  assert.equal(insights.studyConsistencyPercent, 50);
  assert.ok(insights.recommendedActions.some((r) => r.subjectId === 'subj-physics'));
});

test('validateStudyMaterialFile enforces safe formats and 200KB cap', () => {
  assert.equal(validateStudyMaterialFile({ name: 'notes.md', size: 1024 }).ok, true);
  assert.equal(validateStudyMaterialFile({ name: 'slides.pdf', size: 50_000 }).ok, true);
  assert.equal(validateStudyMaterialFile({ name: 'malware.exe', size: 512 }).ok, false);
  assert.equal(validateStudyMaterialFile({ name: 'empty.txt', size: 0 }).ok, false);
  assert.equal(validateStudyMaterialFile({ name: 'huge.pdf', size: 500_000 }).ok, false);
});
