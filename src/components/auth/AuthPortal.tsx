import React, { useMemo, useState } from 'react';
import {
  browserPopupRedirectResolver,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  updateProfile,
  type AuthError,
} from 'firebase/auth';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Lock, Shield, Sparkles } from 'lucide-react';
import { auth, authPersistenceReady, googleProvider } from '../../lib/firebase';
import {
  ensureStudentProfileFromAuth,
  setPendingSignupName,
} from '../../lib/studentService';
import {
  mapFirebaseAuthError,
  validateEmail,
  validatePasswordStrength,
  validateSignInForm,
  validateSignUpForm,
} from '../../utils/authValidation';
import {
  Button,
  GoogleLogoSvg,
  SurfaceCard,
  TextInput,
  ToastBanner,
} from '../ui/DesignSystem';

interface AuthPortalProps {
  initialTab?: 'signin' | 'signup' | 'reset';
  onBackToHome: () => void;
  onEnterDemoStudent: () => void;
  onEnterDemoAdmin: () => void;
}

export function AuthPortal({
  initialTab = 'signin',
  onBackToHome,
  onEnterDemoStudent,
  onEnterDemoAdmin,
}: AuthPortalProps) {
  const [tab, setTab] = useState<'signin' | 'signup' | 'reset'>(initialTab);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isBusy = googleLoading || formLoading;
  const passwordStrength = useMemo(() => validatePasswordStrength(password), [password]);

  const handleGooglePopup = async () => {
    if (isBusy) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setPopupBlocked(false);
    setGoogleLoading(true);
    try {
      // Open the popup synchronously inside the click handler. Awaiting anything
      // first (e.g. persistence setup) drops the browser's user-gesture context,
      // and Safari/mobile/Chrome then silently block the Google window.
      // Firebase Auth already queues this behind the pending setPersistence call.
      await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
    } catch (err) {
      const code = (err as AuthError)?.code || '';
      if (code === 'auth/popup-blocked') {
        setPopupBlocked(true);
      }
      setErrorMsg(mapFirebaseAuthError(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleRedirect = async () => {
    if (isBusy) return;
    setErrorMsg(null);
    setGoogleLoading(true);
    try {
      await authPersistenceReady;
      await signInWithRedirect(auth, googleProvider);
    } catch (err) {
      setErrorMsg(mapFirebaseAuthError(err));
      setGoogleLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    if (tab === 'signin') {
      const check = validateSignInForm({ email, password });
      if (!check.valid) {
        setErrorMsg(check.error || 'Please verify your sign-in credentials.');
        return;
      }

      setFormLoading(true);
      try {
        await authPersistenceReady;
        await signInWithEmailAndPassword(auth, check.normalizedEmail, password);
      } catch (err) {
        setErrorMsg(mapFirebaseAuthError(err));
      } finally {
        setFormLoading(false);
      }
      return;
    }

    if (tab === 'signup') {
      const check = validateSignUpForm({
        fullName,
        email,
        password,
        confirmPassword,
      });
      if (!check.valid) {
        setErrorMsg(check.error || 'Please check your registration details.');
        return;
      }

      setFormLoading(true);
      try {
        await authPersistenceReady;
        setPendingSignupName(check.normalizedEmail, check.trimmedName);
        const cred = await createUserWithEmailAndPassword(
          auth,
          check.normalizedEmail,
          password
        );
        await updateProfile(cred.user, { displayName: check.trimmedName });
        await ensureStudentProfileFromAuth(cred.user, check.trimmedName);
        void sendEmailVerification(cred.user).catch(() => {});
      } catch (err) {
        setErrorMsg(mapFirebaseAuthError(err));
      } finally {
        setFormLoading(false);
      }
      return;
    }

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      setErrorMsg(emailCheck.error || 'Please enter a valid email address.');
      return;
    }

    setFormLoading(true);
    try {
      await authPersistenceReady;
      await sendPasswordResetEmail(auth, emailCheck.normalized);
      setSuccessMsg(
        `Password reset instructions sent to ${emailCheck.normalized} if an account exists for that address.`
      );
    } catch (err) {
      setErrorMsg(mapFirebaseAuthError(err));
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="relative z-10 flex min-h-screen flex-col justify-between px-6 py-8">
      <div className="mx-auto flex w-full max-w-[1120px] items-center justify-between">
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-2 text-sm text-[#AAA6A0] hover:text-[#F5D78E] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to SkillPath AI
        </button>
        <span className="font-display text-sm font-semibold text-[#D4AF70]">
          Authentication Portal
        </span>
      </div>

      <div className="mx-auto my-8 grid w-full max-w-[1040px] grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Editorial Context & Mode Selection */}
        <div className="flex flex-col justify-between space-y-8 lg:col-span-5 lg:py-4">
          <div className="space-y-4">
            <p className="text-xs font-medium tracking-[0.14em] uppercase text-[#D4AF70]">
              Identity &amp; Workspace Access
            </p>
            <h1 className="font-display text-3xl font-bold tracking-tight text-[#F7F3EA]">
              Enter your academic workspace.
            </h1>
            <p className="text-sm leading-relaxed text-[#AAA6A0]">
              Sign in with Google or register with your email for persistent Firestore profiles, or explore the full platform immediately in Demo Mode.
            </p>
          </div>

          <SurfaceCard className="space-y-4 p-5">
            <div className="space-y-1">
              <p className="font-display text-sm font-semibold text-[#F7F3EA]">
                Evaluation &amp; Demo Modes
              </p>
              <p className="text-xs text-[#AAA6A0]">
                Explicitly labelled preview environments using representative sample student telemetry.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
              <Button
                variant="secondary"
                className="w-full justify-between"
                disabled={isBusy}
                onClick={onEnterDemoStudent}
              >
                <span className="inline-flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#D4AF70]" />
                  Demo Student Mode
                </span>
                <span className="text-xs text-[#AAA6A0]">Elena Vance</span>
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-between"
                disabled={isBusy}
                onClick={onEnterDemoAdmin}
              >
                <span className="inline-flex items-center gap-2">
                  <Shield className="h-4 w-4 text-[#D4AF70]" />
                  Demo Admin Preview
                </span>
                <span className="text-xs text-[#AAA6A0]">Cohort View</span>
              </Button>
            </div>
            <p className="text-[11px] leading-relaxed text-[#7D7973]">
              Live Administrator privileges are strictly verified on the server and via Firestore security rules—never by frontend selection.
            </p>
          </SurfaceCard>
        </div>

        {/* Right Authentication Card */}
        <SurfaceCard className="p-7 sm:p-9 lg:col-span-7">
          <div className="space-y-6">
            {/* Mode Tabs */}
            <div
              role="tablist"
              aria-label="Authentication action"
              className="grid grid-cols-3 gap-1 rounded-lg bg-[#11121A] p-1 border border-[rgba(212,175,112,0.14)]"
            >
              {(
                [
                  { id: 'signin', label: 'Sign In' },
                  { id: 'signup', label: 'Sign Up' },
                  { id: 'reset', label: 'Reset Password' },
                ] as const
              ).map((item) => {
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    disabled={isBusy}
                    onClick={() => {
                      setTab(item.id);
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className={`rounded-md py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-[#20212B] text-[#F5D78E]'
                        : 'text-[#AAA6A0] hover:text-[#F7F3EA]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Official White Glassmorphism Google Sign-In Button */}
            <div className="space-y-2.5">
              <Button
                variant="google"
                size="lg"
                loading={googleLoading}
                disabled={isBusy}
                onClick={handleGooglePopup}
                className="w-full"
              >
                <GoogleLogoSvg />
                <span>{googleLoading ? 'Authenticating with Google...' : 'Continue with Google'}</span>
              </Button>

              {popupBlocked && (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isBusy}
                  onClick={handleGoogleRedirect}
                  className="w-full"
                >
                  Use Redirect Sign-In Instead
                </Button>
              )}
            </div>

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-[rgba(212,175,112,0.14)]" />
              <span className="mx-3 text-xs text-[#7D7973]">or continue with email</span>
              <div className="flex-grow border-t border-[rgba(212,175,112,0.14)]" />
            </div>

            {errorMsg && (
              <ToastBanner
                tone="error"
                message={errorMsg}
                onDismiss={() => setErrorMsg(null)}
              />
            )}
            {successMsg && (
              <ToastBanner
                tone="success"
                message={successMsg}
                onDismiss={() => setSuccessMsg(null)}
              />
            )}

            <form onSubmit={handleEmailSubmit} className="space-y-4" noValidate>
              {tab === 'signup' && (
                <TextInput
                  label="Full Name"
                  type="text"
                  placeholder="Elena Vance"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  disabled={isBusy}
                  required
                />
              )}

              <TextInput
                label="Academic or Personal Email"
                type="email"
                placeholder="scholar@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={isBusy}
                required
              />

              {tab !== 'reset' && (
                <div className="space-y-2">
                  <TextInput
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={
                      tab === 'signup'
                        ? 'Min 8 chars, upper, lower, number'
                        : 'Enter your password'
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                    disabled={isBusy}
                    required
                    rightAdornment={
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="rounded p-1 text-[#7D7973] hover:text-[#F5D78E] transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    }
                  />

                  {tab === 'signup' && password.length > 0 && (
                    <div className="rounded-lg border border-[rgba(212,175,112,0.14)] bg-[#11121A] px-3 py-2.5 text-[11px] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[#AAA6A0]">Password strength</span>
                        <span
                          className={
                            passwordStrength.label === 'Strong'
                              ? 'font-medium text-[#70D4A2]'
                              : passwordStrength.label === 'Fair'
                              ? 'font-medium text-[#F5D78E]'
                              : 'font-medium text-[#F29C9F]'
                          }
                        >
                          {passwordStrength.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[#7D7973]">
                        <span className={passwordStrength.checks.minLength ? 'text-[#70D4A2]' : ''}>
                          • 8+ characters
                        </span>
                        <span className={passwordStrength.checks.hasUpper ? 'text-[#70D4A2]' : ''}>
                          • Uppercase letter
                        </span>
                        <span className={passwordStrength.checks.hasLower ? 'text-[#70D4A2]' : ''}>
                          • Lowercase letter
                        </span>
                        <span className={passwordStrength.checks.hasNumber ? 'text-[#70D4A2]' : ''}>
                          • At least 1 number
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === 'signup' && (
                <TextInput
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={isBusy}
                  required
                  rightAdornment={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      aria-label={
                        showConfirmPassword
                          ? 'Hide confirmation password'
                          : 'Show confirmation password'
                      }
                      className="rounded p-1 text-[#7D7973] hover:text-[#F5D78E] transition-colors"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  }
                />
              )}

              {tab === 'signin' && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => {
                      setTab('reset');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-xs text-[#D4AF70] hover:text-[#F5D78E] transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                loading={formLoading}
                disabled={isBusy}
                className="w-full"
              >
                <Lock className="h-4 w-4" />
                {formLoading
                  ? tab === 'signin'
                    ? 'Signing In...'
                    : tab === 'signup'
                    ? 'Creating Student Account...'
                    : 'Sending Reset Link...'
                  : tab === 'signin'
                  ? 'Sign In to Workspace'
                  : tab === 'signup'
                  ? 'Create Student Account'
                  : 'Send Password Reset Link'}
              </Button>
            </form>

            <div className="flex items-start gap-2.5 border-t border-[rgba(212,175,112,0.12)] pt-4 text-xs text-[#7D7973]">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D4AF70]" />
              <span>
                First-time registration via Google or Email/Password automatically creates your UID-keyed Firestore student profile while preserving all assessments and roadmap progress on future logins.
              </span>
            </div>
          </div>
        </SurfaceCard>
      </div>

      <div className="mx-auto w-full max-w-[1120px] text-center text-xs text-[#7D7973]">
        SkillPath AI · Firebase Authentication &amp; Role-Verified Access Control
      </div>
    </div>
  );
}
