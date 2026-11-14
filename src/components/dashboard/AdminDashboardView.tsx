import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { DEMO_ADMIN_STUDENTS } from '../../data/curriculum';
import { fetchAllStudentsForAdmin } from '../../lib/studentService';
import type { AdminStudentSummary } from '../../types/skillpath';
import { Button, ModalDialog, ProgressBar, SurfaceCard, ToastBanner } from '../ui/DesignSystem';

interface AdminDashboardViewProps {
  isDemo: boolean;
}

export function AdminDashboardView({ isDemo }: AdminDashboardViewProps) {
  const [students, setStudents] = useState<AdminStudentSummary[]>(
    isDemo ? DEMO_ADMIN_STUDENTS : []
  );
  const [loading, setLoading] = useState(!isDemo);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [inspectStudent, setInspectStudent] = useState<AdminStudentSummary | null>(null);

  const loadRoster = async () => {
    if (isDemo) {
      setStudents(DEMO_ADMIN_STUDENTS);
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const list = await fetchAllStudentsForAdmin();
      setStudents(list);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Unable to query student cohort. Ensure your admin permissions are verified.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRoster();
  }, [isDemo]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.displayName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.selectedCareerTitle.toLowerCase().includes(q) ||
        s.academicTrack.toLowerCase().includes(q)
    );
  }, [students, search]);

  const meanReadiness =
    students.length === 0
      ? 0
      : Math.round(students.reduce((acc, s) => acc + s.readinessScore, 0) / students.length);

  const meanRoadmap =
    students.length === 0
      ? 0
      : Math.round(students.reduce((acc, s) => acc + s.roadmapPercent, 0) / students.length);

  const totalWeeklyHours = students.reduce((acc, s) => acc + s.weeklyStudyHours, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 border-b border-[rgba(212,175,112,0.14)] pb-6 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <p className="text-xs font-medium tracking-[0.12em] uppercase text-[#D4AF70]">
            Verified Administrator Governance
          </p>
          <h2 className="font-display text-2xl font-bold text-[#F7F3EA]">
            Platform Analytics &amp; Cohort Management
          </h2>
          <p className="text-sm text-[#AAA6A0]">
            {isDemo
              ? 'Displaying representative sample cohort data in Demo Admin Preview.'
              : 'Live Firestore cohort roster validated by server-side admin verification.'}
          </p>
        </div>

        <Button size="sm" variant="secondary" loading={loading} onClick={loadRoster}>
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh Telemetry
        </Button>
      </div>

      {errorMsg && (
        <ToastBanner tone="error" message={errorMsg} onDismiss={() => setErrorMsg(null)} />
      )}

      {/* Platform KPI Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SurfaceCard className="p-5">
          <p className="text-xs text-[#AAA6A0]">Registered Cohort</p>
          <p className="mt-2 font-mono-tabular text-3xl font-semibold text-[#F5D78E]">
            {students.length}
          </p>
          <p className="mt-1 text-xs text-[#7D7973]">Active student profiles</p>
        </SurfaceCard>

        <SurfaceCard className="p-5">
          <p className="text-xs text-[#AAA6A0]">Mean Career Readiness</p>
          <p className="mt-2 font-mono-tabular text-3xl font-semibold text-[#F7F3EA]">
            {meanReadiness}%
          </p>
          <p className="mt-1 text-xs text-[#7D7973]">Across active target pathways</p>
        </SurfaceCard>

        <SurfaceCard className="p-5">
          <p className="text-xs text-[#AAA6A0]">Mean Roadmap Completion</p>
          <p className="mt-2 font-mono-tabular text-3xl font-semibold text-[#F7F3EA]">
            {meanRoadmap}%
          </p>
          <p className="mt-1 text-xs text-[#7D7973]">Stage milestone velocity</p>
        </SurfaceCard>

        <SurfaceCard className="p-5">
          <p className="text-xs text-[#AAA6A0]">Cohort Weekly Focus</p>
          <p className="mt-2 font-mono-tabular text-3xl font-semibold text-[#F7F3EA]">
            {totalWeeklyHours}h
          </p>
          <p className="mt-1 text-xs text-[#7D7973]">Combined weekly study hours</p>
        </SurfaceCard>
      </div>

      {/* Student Management Table */}
      <SurfaceCard className="overflow-hidden">
        <div className="flex flex-col justify-between gap-4 border-b border-[rgba(212,175,112,0.14)] p-6 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-display text-base font-semibold text-[#F7F3EA]">
              Student Cohort Directory
            </h3>
            <p className="text-xs text-[#AAA6A0]">
              Inspect individual readiness alignment and academic progress
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#7D7973]"
            />
            <input
              type="search"
              aria-label="Filter student roster"
              placeholder="Filter by name, email, or pathway..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-lg border border-[rgba(212,175,112,0.2)] bg-[#11121A] pr-3 pl-9 text-xs text-[#F7F3EA] placeholder:text-[#6F6B66] focus:border-[#D4AF70] focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[rgba(212,175,112,0.14)] bg-[#11121A] text-xs font-medium text-[#AAA6A0]">
                <th className="px-6 py-3">Student</th>
                <th className="px-4 py-3">Academic Track</th>
                <th className="px-4 py-3">Target Pathway</th>
                <th className="px-4 py-3 text-right">Readiness</th>
                <th className="px-4 py-3 text-right">Roadmap</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(212,175,112,0.1)]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-[#7D7973]">
                    {loading ? 'Loading cohort records...' : 'No student records match your filter.'}
                  </td>
                </tr>
              ) : (
                filtered.map((student) => (
                  <tr
                    key={student.uid}
                    className="hover:bg-[#11121A]/70 transition-colors"
                  >
                    <td className="px-6 py-3.5">
                      <p className="font-medium text-[#F7F3EA]">{student.displayName}</p>
                      <p className="text-xs text-[#7D7973]">{student.email}</p>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[#AAA6A0]">
                      {student.academicTrack}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[#F7F3EA]">
                      {student.selectedCareerTitle}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono-tabular text-xs font-semibold text-[#F5D78E]">
                      {student.readinessScore}%
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono-tabular text-xs text-[#F7F3EA]">
                      {student.roadmapPercent}%
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setInspectStudent(student)}
                        className="text-xs font-medium text-[#D4AF70] hover:text-[#F5D78E]"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SurfaceCard>

      <SurfaceCard className="flex items-start gap-3 p-5 text-xs text-[#AAA6A0]">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#D4AF70]" />
        <div>
          <p className="font-medium text-[#F7F3EA]">Zero-Trust Security Boundary Active</p>
          <p className="mt-1">
            Administrator access requires both a verified Firebase ID token check on the server and authoritative Firestore security rules matching verified admin credentials.
          </p>
        </div>
      </SurfaceCard>

      <ModalDialog
        open={Boolean(inspectStudent)}
        title={inspectStudent ? inspectStudent.displayName : ''}
        onClose={() => setInspectStudent(null)}
      >
        {inspectStudent && (
          <div className="space-y-4">
            <div className="space-y-1 text-xs text-[#AAA6A0]">
              <p>Email: {inspectStudent.email}</p>
              <p>Institution: {inspectStudent.institution}</p>
              <p>Track: {inspectStudent.academicTrack}</p>
              <p>Target Role: {inspectStudent.selectedCareerTitle}</p>
              <p>Weekly Study Cadence: {inspectStudent.weeklyStudyHours} hours/week</p>
            </div>
            <div className="space-y-3 pt-2">
              <ProgressBar label="Career Readiness" value={inspectStudent.readinessScore} />
              <ProgressBar label="Roadmap Completion" value={inspectStudent.roadmapPercent} />
            </div>
            <div className="flex justify-end pt-2">
              <Button size="sm" variant="secondary" onClick={() => setInspectStudent(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </ModalDialog>
    </div>
  );
}
