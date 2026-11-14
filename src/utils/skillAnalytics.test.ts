import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAverageSkillScore,
  calculateOverallReadiness,
  calculateRoadmapProgress,
  calculateSkillGaps,
  getCareerById,
  isValidFirestoreId,
  sanitizeStudentPatch,
} from './skillAnalytics';

test('calculateOverallReadiness computes bounded percentage against target career', () => {
  const career = getCareerById('ai-systems-architect');
  const fullScores = { ...career.requiredSkills };
  assert.equal(calculateOverallReadiness(fullScores, career), 100);

  const zeroScores = {
    systems_architecture: 0,
    applied_ml: 0,
    algorithmic_reasoning: 0,
    fullstack_engineering: 0,
    quantitative_literacy: 0,
    technical_communication: 0,
  };
  assert.equal(calculateOverallReadiness(zeroScores, career), 0);
});

test('calculateAverageSkillScore averages and clamps scores', () => {
  const avg = calculateAverageSkillScore({
    systems_architecture: 80,
    applied_ml: 60,
    algorithmic_reasoning: 70,
    fullstack_engineering: 90,
    quantitative_literacy: 120, // clamped to 100
    technical_communication: -10, // clamped to 0
  });
  assert.equal(avg, Math.round((80 + 60 + 70 + 90 + 100 + 0) / 6));
});

test('calculateSkillGaps orders largest deficit first and classifies statuses', () => {
  const career = getCareerById('ai-systems-architect');
  const gaps = calculateSkillGaps(
    {
      systems_architecture: 60, // target 88 => -28 Focus Area
      applied_ml: 80, // target 86 => -6 On Track
      algorithmic_reasoning: 82, // target 80 => +2 Strength
      fullstack_engineering: 78,
      quantitative_literacy: 76,
      technical_communication: 84,
    },
    career
  );

  assert.equal(gaps[0].categoryId, 'systems_architecture');
  assert.equal(gaps[0].status, 'Focus Area');
  assert.equal(gaps[0].delta, -28);

  const mlGap = gaps.find((g) => g.categoryId === 'applied_ml');
  assert.equal(mlGap?.status, 'On Track');

  const algoGap = gaps.find((g) => g.categoryId === 'algorithmic_reasoning');
  assert.equal(algoGap?.status, 'Strength');
});

test('calculateRoadmapProgress calculates stage and overall completion percentages', () => {
  const career = getCareerById('ai-systems-architect');
  const progress = calculateRoadmapProgress(['ai-arch-m1', 'ai-arch-m2', 'ai-arch-m3'], career);
  assert.equal(progress.completedCount, 3);
  assert.equal(progress.totalCount, 6);
  assert.equal(progress.percentage, 50);
  assert.equal(progress.stages[0].percentage, 100);
  assert.equal(progress.stages[1].percentage, 50);
  assert.equal(progress.stages[2].percentage, 0);
});

test('sanitizeStudentPatch enforces blueprint bounds and strips role escalation', () => {
  const dirtyPatch = {
    displayName: '   ' + 'A'.repeat(200),
    role: 'admin' as const,
    graduationYear: 3000,
    weeklyStudyHours: 999,
    careerInterests: Array.from({ length: 20 }, (_, i) => `Interest ${i}`),
    selectedCareerId: 'invalid id!!',
  };

  const clean = sanitizeStudentPatch(dirtyPatch);
  assert.equal(clean.displayName?.length, 120);
  assert.equal('role' in clean, false);
  assert.equal(clean.graduationYear, 2045);
  assert.equal(clean.weeklyStudyHours, 120);
  assert.equal(clean.careerInterests?.length, 10);
  assert.equal(clean.selectedCareerId, undefined);
});

test('isValidFirestoreId validates document ID regex', () => {
  assert.equal(isValidFirestoreId('user_123-abc'), true);
  assert.equal(isValidFirestoreId('bad/path'), false);
  assert.equal(isValidFirestoreId(''), false);
});
