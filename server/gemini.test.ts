import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GeminiServiceError,
  mapGeminiError,
  selectSpecialistAgent,
  validateMentorInput,
} from './gemini.ts';

test('selectSpecialistAgent routes orchestrator prompts to matching specialists', () => {
  assert.equal(
    selectSpecialistAgent('orchestrator', 'How should I position my portfolio for a staff role?'),
    'career_strategist'
  );
  assert.equal(
    selectSpecialistAgent('orchestrator', 'Build a 4-week roadmap for my next milestone'),
    'curriculum_architect'
  );
  assert.equal(
    selectSpecialistAgent('orchestrator', 'Quiz me on my weakest skill gap'),
    'assessment_coach'
  );
  assert.equal(
    selectSpecialistAgent('orchestrator', 'Explain Raft log replication safety invariants'),
    'technical_tutor'
  );
  assert.equal(
    selectSpecialistAgent('career_strategist', 'Explain Raft log replication'),
    'career_strategist'
  );
});

test('validateMentorInput enforces length bounds and sanitizes history', () => {
  assert.throws(
    () => validateMentorInput({ message: 'a', agentRole: 'orchestrator' }),
    (err: unknown) => err instanceof GeminiServiceError && err.statusCode === 400
  );

  const valid = validateMentorInput({
    message: 'How do I improve my systems architecture readiness?',
    agentRole: 'unknown_role',
    history: [
      { sender: 'user', content: 'Hello' },
      { sender: 'invalid', content: 'Drop me' },
      { sender: 'agent', content: 'Hi there' },
    ],
  });

  assert.equal(valid.agentRole, 'orchestrator');
  assert.equal(valid.history?.length, 2);
});

test('mapGeminiError maps API key and rate limit errors without leaking secrets', () => {
  const keyErr = mapGeminiError(new Error('API_KEY_INVALID for key AIzaSecretDoNotLeak'));
  assert.equal(keyErr.statusCode, 403);
  assert.equal(keyErr.message.includes('AIzaSecretDoNotLeak'), false);

  const rateErr = mapGeminiError(new Error('429 RESOURCE_EXHAUSTED'));
  assert.equal(rateErr.statusCode, 429);
});
