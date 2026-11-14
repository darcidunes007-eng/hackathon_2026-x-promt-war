import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mapFirebaseAuthError,
  validateEmail,
  validatePasswordStrength,
  validateSignInForm,
  validateSignUpForm,
} from './authValidation';

test('validateEmail trims and validates email formats', () => {
  const ok = validateEmail('  scholar@university.edu ');
  assert.equal(ok.valid, true);
  assert.equal(ok.normalized, 'scholar@university.edu');

  assert.equal(validateEmail('').valid, false);
  assert.equal(validateEmail('not-an-email').valid, false);
  assert.equal(validateEmail('bad@domain').valid, false);
});

test('validatePasswordStrength enforces minimum length, uppercase, lowercase, and digit', () => {
  assert.equal(validatePasswordStrength('short1A').valid, false);
  assert.equal(validatePasswordStrength('alllowercase1').valid, false);
  assert.equal(validatePasswordStrength('ALLUPPERCASE1').valid, false);
  assert.equal(validatePasswordStrength('NoNumbersHere').valid, false);

  const strong = validatePasswordStrength('SkillPath2026');
  assert.equal(strong.valid, true);
  assert.equal(strong.label, 'Strong');
  assert.equal(strong.score, 4);
});

test('validateSignUpForm rejects mismatched confirmation passwords and short names', () => {
  const shortName = validateSignUpForm({
    fullName: 'A',
    email: 'elena@university.edu',
    password: 'Password123',
    confirmPassword: 'Password123',
  });
  assert.equal(shortName.valid, false);

  const mismatch = validateSignUpForm({
    fullName: 'Elena Vance',
    email: 'elena@university.edu',
    password: 'Password123',
    confirmPassword: 'Password124',
  });
  assert.equal(mismatch.valid, false);

  const valid = validateSignUpForm({
    fullName: ' Elena Vance ',
    email: ' elena@university.edu ',
    password: 'Password123',
    confirmPassword: 'Password123',
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.trimmedName, 'Elena Vance');
  assert.equal(valid.normalizedEmail, 'elena@university.edu');
});

test('validateSignInForm validates credentials without rejecting legacy >=6 char passwords', () => {
  assert.equal(validateSignInForm({ email: 'bad', password: 'Password1' }).valid, false);
  assert.equal(validateSignInForm({ email: 'a@b.co', password: '123' }).valid, false);
  assert.equal(validateSignInForm({ email: 'a@b.co', password: '123456' }).valid, true);
});

test('mapFirebaseAuthError provides explicit messages for duplicate, credential, and disabled provider errors', () => {
  assert.match(
    mapFirebaseAuthError({ code: 'auth/email-already-in-use' }),
    /already exists/i
  );
  assert.match(
    mapFirebaseAuthError({ code: 'auth/invalid-credential' }),
    /Invalid email address or password/i
  );
  assert.match(
    mapFirebaseAuthError({ code: 'auth/operation-not-allowed' }),
    /Email\/Password sign-in is disabled in Firebase Console/i
  );
});
