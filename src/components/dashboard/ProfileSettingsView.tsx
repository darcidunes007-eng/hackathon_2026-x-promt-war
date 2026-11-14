import React, { useState } from 'react';
import { sendEmailVerification } from 'firebase/auth';
import { Plus, Trash2 } from 'lucide-react';
import { auth } from '../../lib/firebase';
import type { StudentProfile } from '../../types/skillpath';
import { Button, SurfaceCard, TextInput, ToastBanner } from '../ui/DesignSystem';

interface ProfileSettingsViewProps {
  profile: StudentProfile;
  isDemo: boolean;
  isAdminAuthorized: boolean;
  onSaveProfile: (patch: Partial<StudentProfile>) => Promise<void>;
}

export function ProfileSettingsView({
  profile,
  isDemo,
  isAdminAuthorized,
  onSaveProfile,
}: ProfileSettingsViewProps) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [academicTrack, setAcademicTrack] = useState(profile.academicTrack);
  const [institution, setInstitution] = useState(profile.institution);
  const [graduationYear, setGraduationYear] = useState(String(profile.graduationYear));
  const [weeklyStudyHours, setWeeklyStudyHours] = useState(String(profile.weeklyStudyHours));
  const [interests, setInterests] = useState<string[]>(profile.careerInterests);
  const [newInterest, setNewInterest] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAddInterest = () => {
    const clean = newInterest.trim();
    if (!clean || interests.length >= 10 || interests.includes(clean)) return;
    setInterests((prev) => [...prev, clean.slice(0, 60)]);
    setNewInterest('');
  };

  const handleRemoveInterest = (item: string) => {
    setInterests((prev) => prev.filter((i) => i !== item));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    setErrorMsg(null);

    if (displayName.trim().length < 2) {
      setErrorMsg('Display name must be at least 2 characters.');
      return;
    }

    setSaving(true);
    try {
      await onSaveProfile({
        displayName: displayName.trim(),
        academicTrack: academicTrack.trim(),
        institution: institution.trim(),
        graduationYear: Number(graduationYear) || 2027,
        weeklyStudyHours: Number(weeklyStudyHours) || 10,
        careerInterests: interests,
      });
      setNotice('Student profile and academic preferences saved.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const emailVerified = isDemo ? true : Boolean(auth.currentUser?.emailVerified);

  const handleResendVerification = async () => {
    if (!auth.currentUser) return;
    try {
      await sendEmailVerification(auth.currentUser);
      setNotice('Verification email sent. Check your inbox and refresh after confirming.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to send verification email.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-1 border-b border-[rgba(212,175,112,0.14)] pb-6">
        <p className="text-xs font-medium tracking-[0.12em] uppercase text-[#D4AF70]">
          Academic Record
        </p>
        <h2 className="font-display text-2xl font-bold text-[#F7F3EA]">
          Profile &amp; Settings
        </h2>
        <p className="text-sm text-[#AAA6A0]">
          Manage personal details, academic concentration, career interests, and account verification.
        </p>
      </div>

      {notice && (
        <ToastBanner tone="success" message={notice} onDismiss={() => setNotice(null)} />
      )}
      {errorMsg && (
        <ToastBanner tone="error" message={errorMsg} onDismiss={() => setErrorMsg(null)} />
      )}

      {!isDemo && !emailVerified && (
        <SurfaceCard className="flex flex-col justify-between gap-4 border-[#9E783B] p-5 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <p className="font-display text-sm font-semibold text-[#F5D78E]">
              Verify Your Email Address
            </p>
            <p className="text-xs text-[#AAA6A0]">
              Your student profile and learning roadmap sync to Firestore immediately. Confirm your email via the verification link to complete account verification.
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={handleResendVerification}>
            Resend Verification Email
          </Button>
        </SurfaceCard>
      )}

      <form onSubmit={handleSave} className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <SurfaceCard className="space-y-5 p-6 lg:col-span-7">
          <h3 className="font-display text-base font-semibold text-[#F7F3EA]">
            Student &amp; Academic Information
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextInput
              label="Full Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
            <TextInput label="Email Address" value={profile.email} disabled />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextInput
              label="Academic Program / Track"
              value={academicTrack}
              onChange={(e) => setAcademicTrack(e.target.value)}
            />
            <TextInput
              label="University / Institution"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextInput
              label="Expected Graduation Year"
              type="number"
              min={1990}
              max={2045}
              value={graduationYear}
              onChange={(e) => setGraduationYear(e.target.value)}
            />
            <TextInput
              label="Weekly Study Focus Budget (Hours)"
              type="number"
              min={1}
              max={100}
              value={weeklyStudyHours}
              onChange={(e) => setWeeklyStudyHours(e.target.value)}
            />
          </div>

          <div className="pt-2">
            <Button type="submit" loading={saving}>
              Save Profile Changes
            </Button>
          </div>
        </SurfaceCard>

        <div className="space-y-6 lg:col-span-5">
          <SurfaceCard className="space-y-4 p-6">
            <div>
              <h3 className="font-display text-base font-semibold text-[#F7F3EA]">
                Career Interests
              </h3>
              <p className="text-xs text-[#AAA6A0]">
                Up to 10 focus domains shared with the AI Mentor and Career Explorer.
              </p>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <TextInput
                  label="Add Interest"
                  placeholder="e.g., Distributed Consensus"
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddInterest}
                  aria-label="Add career interest"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <ul className="divide-y divide-[rgba(212,175,112,0.12)]">
              {interests.map((item) => (
                <li key={item} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-[#F7F3EA]">{item}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveInterest(item)}
                    aria-label={`Remove ${item}`}
                    className="rounded p-1 text-[#7D7973] hover:bg-[#20212B] hover:text-[#F29C9F]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </SurfaceCard>

          <SurfaceCard className="space-y-2 p-6 text-xs text-[#AAA6A0]">
            <h3 className="font-display text-sm font-semibold text-[#F7F3EA]">
              Account &amp; Security Status
            </h3>
            <div className="flex justify-between pt-1">
              <span>Workspace Mode</span>
              <span className="text-[#F5D78E]">{isDemo ? 'Demo Preview' : 'Live Firestore'}</span>
            </div>
            <div className="flex justify-between">
              <span>Verified Role</span>
              <span className="text-[#F7F3EA]">
                {isAdminAuthorized ? 'Administrator' : 'Student'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Email Verification</span>
              <span className="text-[#F7F3EA]">{emailVerified ? 'Verified' : 'Pending'}</span>
            </div>
          </SurfaceCard>
        </div>
      </form>
    </div>
  );
}
