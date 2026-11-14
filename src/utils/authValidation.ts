import type { AuthError } from 'firebase/auth';

export interface EmailValidationResult {
  valid: boolean;
  normalized: string;
  error?: string;
}

export interface PasswordChecks {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
}

export interface PasswordValidationResult {
  valid: boolean;
  checks: PasswordChecks;
  score: number; // 0..4
  label: 'Weak' | 'Fair' | 'Strong';
  error?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(email: string): EmailValidationResult {
  const normalized = email.trim();
  if (!normalized) {
    return { valid: false, normalized, error: 'Please enter your email address.' };
  }
  if (normalized.length > 254 || !EMAIL_REGEX.test(normalized)) {
    return {
      valid: false,
      normalized,
      error: 'Please enter a valid academic or personal email address.',
    };
  }
  return { valid: true, normalized };
}

export function validatePasswordStrength(password: string): PasswordValidationResult {
  const checks: PasswordChecks = {
    minLength: password.length >= 8 && password.length <= 128,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
  };

  const score =
    Number(checks.minLength) +
    Number(checks.hasUpper) +
    Number(checks.hasLower) +
    Number(checks.hasNumber);

  const label: 'Weak' | 'Fair' | 'Strong' =
    score >= 4 ? 'Strong' : score >= 2 ? 'Fair' : 'Weak';

  if (password.length > 128) {
    return {
      valid: false,
      checks,
      score,
      label: 'Weak',
      error: 'Password must be 128 characters or fewer.',
    };
  }

  if (!checks.minLength) {
    return {
      valid: false,
      checks,
      score,
      label,
      error: 'Password must be at least 8 characters long.',
    };
  }

  if (!checks.hasUpper || !checks.hasLower || !checks.hasNumber) {
    return {
      valid: false,
      checks,
      score,
      label,
      error: 'Password must include uppercase, lowercase, and at least one number.',
    };
  }

  return { valid: true, checks, score, label };
}

export function validateSignUpForm(input: {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}): { valid: boolean; error?: string; normalizedEmail: string; trimmedName: string } {
  const trimmedName = input.fullName.trim();
  const emailCheck = validateEmail(input.email);

  if (trimmedName.length < 2) {
    return {
      valid: false,
      error: 'Please enter your full name (at least 2 characters).',
      normalizedEmail: emailCheck.normalized,
      trimmedName,
    };
  }

  if (trimmedName.length > 120) {
    return {
      valid: false,
      error: 'Full name must be 120 characters or fewer.',
      normalizedEmail: emailCheck.normalized,
      trimmedName,
    };
  }

  if (!emailCheck.valid) {
    return {
      valid: false,
      error: emailCheck.error,
      normalizedEmail: emailCheck.normalized,
      trimmedName,
    };
  }

  const pwCheck = validatePasswordStrength(input.password);
  if (!pwCheck.valid) {
    return {
      valid: false,
      error: pwCheck.error,
      normalizedEmail: emailCheck.normalized,
      trimmedName,
    };
  }

  if (input.password !== input.confirmPassword) {
    return {
      valid: false,
      error: 'Passwords do not match. Please re-enter your confirmation password.',
      normalizedEmail: emailCheck.normalized,
      trimmedName,
    };
  }

  return {
    valid: true,
    normalizedEmail: emailCheck.normalized,
    trimmedName,
  };
}

export function validateSignInForm(input: {
  email: string;
  password: string;
}): { valid: boolean; error?: string; normalizedEmail: string } {
  const emailCheck = validateEmail(input.email);
  if (!emailCheck.valid) {
    return {
      valid: false,
      error: emailCheck.error,
      normalizedEmail: emailCheck.normalized,
    };
  }

  if (!input.password || input.password.length < 6) {
    return {
      valid: false,
      error: 'Please enter your password (minimum 6 characters).',
      normalizedEmail: emailCheck.normalized,
    };
  }

  return {
    valid: true,
    normalizedEmail: emailCheck.normalized,
  };
}

export function mapFirebaseAuthError(err: unknown): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as AuthError).code)
      : '';

  switch (code) {
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was cancelled before completion. You can try again whenever ready.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in popup. Click "Use Redirect Sign-In" below or allow popups for this site.';
    case 'auth/unauthorized-domain':
      return 'This domain is not yet authorized in Firebase Console > Authentication > Settings > Authorized domains.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email using a different sign-in method. Sign in with your original provider.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is disabled in Firebase Console. Enable it in Firebase Console > Authentication > Sign-in method > Email/Password, or use Continue with Google.';
    case 'auth/invalid-email':
      return 'The email address format is invalid. Please verify and try again.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email address or password. Double-check your credentials or reset your password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Switch to Sign In or use Continue with Google.';
    case 'auth/weak-password':
      return 'Password does not meet security requirements. Use at least 8 characters with uppercase, lowercase, and a number.';
    case 'auth/too-many-requests':
      return 'Too many unsuccessful attempts. Please wait a few minutes or reset your password.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact your administrator for assistance.';
    case 'auth/network-request-failed':
      return 'Network request failed. Check your internet connection and retry.';
    default:
      return err instanceof Error && err.message
        ? err.message
        : 'Authentication failed. Please try again.';
  }
}
