import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Check,
  Edit3,
  ExternalLink,
  FileText,
  FolderPlus,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { SKILL_CATEGORIES } from '../../data/curriculum';
import type {
  AcademicAssessmentResult,
  AcademicChapter,
  AcademicSubject,
  AcademicSubjectCategory,
  SkillCategoryId,
  StudyMaterialItem,
} from '../../types/skillpath';
import { suggestSkillForCategory, validateStudyMaterialFile } from '../../utils/academicAnalytics';
import { Button, ModalDialog, ProgressBar, SurfaceCard, TextInput, ToastBanner } from '../ui/DesignSystem';

const SUBJECT_CATEGORIES: AcademicSubjectCategory[] = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Computer Science',
  'Programming',
  'Artificial Intelligence',
  'Data Science',
  'English',
  'Other',
];

interface SubjectsWorkspaceViewProps {
  subjects: AcademicSubject[];
  chapters: AcademicChapter[];
  materials: StudyMaterialItem[];
  assessments: AcademicAssessmentResult[];
  selectedSubjectId: string | null;
  onSelectSubject: (subjectId: string | null) => void;
  onCreateSubject: (
    input: Omit<AcademicSubject, 'id' | 'uid' | 'isDemo' | 'createdAtLabel'>
  ) => Promise<string>;
  onUpdateSubject: (
    subjectId: string,
    patch: Partial<
      Pick<AcademicSubject, 'name' | 'category' | 'description' | 'linkedSkillId' | 'examDate' | 'targetGrade'>
    >
  ) => Promise<void>;
  onDeleteSubject: (subjectId: string) => Promise<void>;
  onCreateChapter: (
    subjectId: string,
    input: Omit<AcademicChapter, 'id' | 'uid' | 'subjectId'>
  ) => Promise<string>;
  onUpdateChapter: (
    subjectId: string,
    chapterId: string,
    patch: Partial<
      Pick<
        AcademicChapter,
        'orderIndex' | 'title' | 'topics' | 'learningObjectives' | 'importantConcepts' | 'completed' | 'estimatedHours'
      >
    >
  ) => Promise<void>;
  onDeleteChapter: (subjectId: string, chapterId: string) => Promise<void>;
  onCreateMaterial: (
    input: Omit<StudyMaterialItem, 'id' | 'uid' | 'createdAtLabel'>
  ) => Promise<string>;
  onDeleteMaterial: (materialId: string) => Promise<void>;
  onOpenMaterialsForSubject: (subjectId: string, chapterId?: string) => void;
  onStartAssessmentForSubject: (subjectId: string, chapterId?: string) => void;
  onAskAssistantForSubject: (subjectId: string, chapterId?: string) => void;
}

export function SubjectsWorkspaceView({
  subjects,
  chapters,
  materials,
  assessments,
  selectedSubjectId,
  onSelectSubject,
  onCreateSubject,
  onUpdateSubject,
  onDeleteSubject,
  onCreateChapter,
  onUpdateChapter,
  onDeleteChapter,
  onCreateMaterial,
  onDeleteMaterial,
  onOpenMaterialsForSubject,
  onStartAssessmentForSubject,
  onAskAssistantForSubject,
}: SubjectsWorkspaceViewProps) {
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  // Subject modal state
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<AcademicSubject | null>(null);
  const [subjName, setSubjName] = useState('');
  const [subjCategory, setSubjCategory] = useState<AcademicSubjectCategory>('Mathematics');
  const [subjSkill, setSubjSkill] = useState<SkillCategoryId>('quantitative_literacy');
  const [subjDesc, setSubjDesc] = useState('');
  const [subjExamDate, setSubjExamDate] = useState('');
  const [subjTargetGrade, setSubjTargetGrade] = useState('');
  const [savingSubject, setSavingSubject] = useState(false);

  // Chapter modal state
  const [chapterModalOpen, setChapterModalOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<AcademicChapter | null>(null);
  const [chapTitle, setChapTitle] = useState('');
  const [chapTopics, setChapTopics] = useState('');
  const [chapObjectives, setChapObjectives] = useState('');
  const [chapConcepts, setChapConcepts] = useState('');
  const [chapHours, setChapHours] = useState('4');
  const [savingChapter, setSavingChapter] = useState(false);

  // Resource creation inside subject workspace
  const [resMode, setResMode] = useState<'note' | 'upload' | 'link'>('note');
  const [resChapterId, setResChapterId] = useState<string>('');
  const [resTitle, setResTitle] = useState('');
  const [resTopic, setResTopic] = useState('');
  const [resContent, setResContent] = useState('');
  const [resUrl, setResUrl] = useState('');
  const [resLinkFormat, setResLinkFormat] = useState<'Reference Link' | 'Video Resource'>('Reference Link');
  const [savingResource, setSavingResource] = useState(false);

  const activeSubject = useMemo(
    () => subjects.find((s) => s.id === selectedSubjectId) ?? subjects[0] ?? null,
    [subjects, selectedSubjectId]
  );

  const activeChapters = useMemo(() => {
    if (!activeSubject) return [];
    return chapters
      .filter((c) => c.subjectId === activeSubject.id)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [chapters, activeSubject]);

  const activeMaterials = useMemo(() => {
    if (!activeSubject) return [];
    return materials.filter((m) => m.subjectId === activeSubject.id);
  }, [materials, activeSubject]);

  const activeAssessments = useMemo(() => {
    if (!activeSubject) return [];
    return assessments.filter((a) => a.subjectId === activeSubject.id);
  }, [assessments, activeSubject]);

  const completedCount = activeChapters.filter((c) => c.completed).length;
  const chapterProgress =
    activeChapters.length === 0 ? 0 : Math.round((completedCount / activeChapters.length) * 100);
  const subjectAvgScore =
    activeAssessments.length === 0
      ? null
      : Math.round(
          activeAssessments.reduce((acc, a) => acc + a.scorePercent, 0) / activeAssessments.length
        );

  const openNewSubjectModal = () => {
    setEditingSubject(null);
    setSubjName('');
    setSubjCategory('Computer Science');
    setSubjSkill(suggestSkillForCategory('Computer Science'));
    setSubjDesc('');
    setSubjExamDate('');
    setSubjTargetGrade('A');
    setSubjectModalOpen(true);
  };

  const openEditSubjectModal = (subj: AcademicSubject) => {
    setEditingSubject(subj);
    setSubjName(subj.name);
    setSubjCategory(subj.category);
    setSubjSkill(subj.linkedSkillId);
    setSubjDesc(subj.description);
    setSubjExamDate(subj.examDate || '');
    setSubjTargetGrade(subj.targetGrade || '');
    setSubjectModalOpen(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (subjName.trim().length < 2) {
      setNotice({ tone: 'error', message: 'Subject name must be at least 2 characters.' });
      return;
    }
    setSavingSubject(true);
    try {
      if (editingSubject) {
        await onUpdateSubject(editingSubject.id, {
          name: subjName.trim(),
          category: subjCategory,
          description: subjDesc.trim(),
          linkedSkillId: subjSkill,
          examDate: subjExamDate.trim(),
          targetGrade: subjTargetGrade.trim(),
        });
        setNotice({ tone: 'success', message: `Updated subject "${subjName.trim()}".` });
      } else {
        const newId = await onCreateSubject({
          name: subjName.trim(),
          category: subjCategory,
          description: subjDesc.trim() || `${subjCategory} coursework and structured mastery workspace.`,
          linkedSkillId: subjSkill,
          examDate: subjExamDate.trim(),
          targetGrade: subjTargetGrade.trim(),
        });
        onSelectSubject(newId);
        setNotice({ tone: 'success', message: `Created subject workspace "${subjName.trim()}".` });
      }
      setSubjectModalOpen(false);
    } catch (err) {
      setNotice({
        tone: 'error',
        message: err instanceof Error ? err.message : 'Unable to save subject.',
      });
    } finally {
      setSavingSubject(false);
    }
  };

  const handleDeleteSubjectClick = async (subj: AcademicSubject) => {
    try {
      await onDeleteSubject(subj.id);
      if (activeSubject?.id === subj.id) {
        onSelectSubject(null);
      }
      setNotice({ tone: 'success', message: `Removed subject "${subj.name}".` });
    } catch (err) {
      setNotice({
        tone: 'error',
        message: err instanceof Error ? err.message : 'Unable to delete subject.',
      });
    }
  };

  const openNewChapterModal = () => {
    setEditingChapter(null);
    setChapTitle('');
    setChapTopics('');
    setChapObjectives('');
    setChapConcepts('');
    setChapHours('4');
    setChapterModalOpen(true);
  };

  const openEditChapterModal = (ch: AcademicChapter) => {
    setEditingChapter(ch);
    setChapTitle(ch.title);
    setChapTopics(ch.topics.join(', '));
    setChapObjectives(ch.learningObjectives.join('; '));
    setChapConcepts(ch.importantConcepts.join('; '));
    setChapHours(String(ch.estimatedHours));
    setChapterModalOpen(true);
  };

  const splitList = (raw: string, separator: ',' | ';') =>
    raw
      .split(separator)
      .map((s) => s.trim())
      .filter(Boolean);

  const handleSaveChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubject || chapTitle.trim().length < 2) return;
    setSavingChapter(true);
    try {
      const topics = splitList(chapTopics, ',');
      const learningObjectives = splitList(chapObjectives, ';');
      const importantConcepts = splitList(chapConcepts, ';');
      const estimatedHours = Math.max(1, Math.min(100, Number(chapHours) || 3));

      if (editingChapter) {
        await onUpdateChapter(activeSubject.id, editingChapter.id, {
          title: chapTitle.trim(),
          topics,
          learningObjectives,
          importantConcepts,
          estimatedHours,
        });
        setNotice({ tone: 'success', message: `Updated chapter "${chapTitle.trim()}".` });
      } else {
        await onCreateChapter(activeSubject.id, {
          orderIndex: activeChapters.length + 1,
          title: chapTitle.trim(),
          topics,
          learningObjectives,
          importantConcepts,
          completed: false,
          estimatedHours,
        });
        setNotice({ tone: 'success', message: `Added chapter "${chapTitle.trim()}".` });
      }
      setChapterModalOpen(false);
    } catch (err) {
      setNotice({
        tone: 'error',
        message: err instanceof Error ? err.message : 'Unable to save chapter.',
      });
    } finally {
      setSavingChapter(false);
    }
  };

  const handleToggleChapterCompleted = async (ch: AcademicChapter) => {
    if (!activeSubject) return;
    try {
      await onUpdateChapter(activeSubject.id, ch.id, { completed: !ch.completed });
    } catch (err) {
      setNotice({
        tone: 'error',
        message: err instanceof Error ? err.message : 'Unable to update chapter status.',
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !activeSubject) return;

    const validation = validateStudyMaterialFile(file);
    if (!validation.ok) {
      setNotice({ tone: 'error', message: validation.error });
      return;
    }

    setSavingResource(true);
    try {
      const lowerName = file.name.toLowerCase();
      let content = '';
      if (lowerName.endsWith('.pdf')) {
        content =
          resContent.trim() ||
          `Uploaded PDF resource "${file.name}" (${Math.max(1, Math.round(file.size / 1024))} KB). Add your key topic notes or summary below to cross-reference with the AI Study Assistant.`;
      } else {
        const rawText = await file.text();
        content = rawText.trim().slice(0, 18000) || `Uploaded file "${file.name}".`;
      }

      await onCreateMaterial({
        subjectId: activeSubject.id,
        chapterId: resChapterId || undefined,
        topic: resTopic.trim() || activeSubject.name,
        title: resTitle.trim() || file.name,
        format: 'Uploaded Document',
        level: 'Intermediate',
        content,
        fileName: file.name,
        fileSizeBytes: file.size,
        sourceType: 'student_upload',
      });
      setResTitle('');
      setResTopic('');
      setResContent('');
      setNotice({ tone: 'success', message: `Uploaded "${file.name}" to ${activeSubject.name}.` });
    } catch (err) {
      setNotice({
        tone: 'error',
        message: err instanceof Error ? err.message : 'Failed to store uploaded resource.',
      });
    } finally {
      setSavingResource(false);
    }
  };

  const handleSaveManualResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubject) return;
    if (resMode === 'link') {
      const cleanUrl = resUrl.trim();
      if (!/^https?:\/\//i.test(cleanUrl)) {
        setNotice({ tone: 'error', message: 'Enter a valid http:// or https:// reference link.' });
        return;
      }
      setSavingResource(true);
      try {
        await onCreateMaterial({
          subjectId: activeSubject.id,
          chapterId: resChapterId || undefined,
          topic: resTopic.trim() || activeSubject.name,
          title: resTitle.trim() || cleanUrl,
          format: resLinkFormat,
          level: 'Intermediate',
          content: resContent.trim() || `External ${resLinkFormat.toLowerCase()} saved for ${activeSubject.name}.`,
          externalUrl: cleanUrl,
          sourceType: 'student_note',
        });
        setResTitle('');
        setResTopic('');
        setResContent('');
        setResUrl('');
        setNotice({ tone: 'success', message: 'Saved external study resource.' });
      } finally {
        setSavingResource(false);
      }
      return;
    }

    if (resContent.trim().length < 5) {
      setNotice({ tone: 'error', message: 'Please enter at least 5 characters of study notes.' });
      return;
    }
    setSavingResource(true);
    try {
      await onCreateMaterial({
        subjectId: activeSubject.id,
        chapterId: resChapterId || undefined,
        topic: resTopic.trim() || activeSubject.name,
        title: resTitle.trim() || `${activeSubject.name} Study Notes`,
        format: 'Detailed Notes',
        level: 'Intermediate',
        content: resContent.trim(),
        sourceType: 'student_note',
      });
      setResTitle('');
      setResTopic('');
      setResContent('');
      setNotice({ tone: 'success', message: 'Saved study note to subject workspace.' });
    } finally {
      setSavingResource(false);
    }
  };

  return (
    <div className="space-y-6">
      {notice && (
        <ToastBanner
          tone={notice.tone}
          message={notice.message}
          onDismiss={() => setNotice(null)}
        />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Sidebar: Subject Directory */}
        <div className="space-y-4 lg:col-span-4">
          <SurfaceCard className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-base font-semibold text-[#F7F3EA]">My Subjects</h3>
                <p className="text-xs text-[#AAA6A0]">
                  {subjects.length} active course{subjects.length === 1 ? '' : 's'}
                </p>
              </div>
              <Button size="sm" onClick={openNewSubjectModal}>
                <Plus className="h-3.5 w-3.5" />
                Add Subject
              </Button>
            </div>

            {subjects.length === 0 ? (
              <div className="rounded-lg border border-[rgba(212,175,112,0.14)] bg-[#11121A] p-4 text-xs text-[#AAA6A0] space-y-3">
                <p>No academic subjects added yet. Create your first subject workspace to organize chapters, notes, and assessments.</p>
                <Button size="sm" variant="secondary" onClick={openNewSubjectModal} className="w-full">
                  <FolderPlus className="h-3.5 w-3.5" />
                  Create First Subject
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {subjects.map((subj) => {
                  const isSelected = activeSubject?.id === subj.id;
                  const subjChaps = chapters.filter((c) => c.subjectId === subj.id);
                  const subjDone = subjChaps.filter((c) => c.completed).length;
                  const subjPct =
                    subjChaps.length === 0 ? 0 : Math.round((subjDone / subjChaps.length) * 100);
                  return (
                    <div
                      key={subj.id}
                      className={`rounded-lg border p-3.5 transition-colors ${
                        isSelected
                          ? 'border-[rgba(245,215,142,0.45)] bg-[#20212B]'
                          : 'border-[rgba(212,175,112,0.14)] bg-[#11121A] hover:border-[rgba(212,175,112,0.3)]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectSubject(subj.id)}
                        className="w-full text-left space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-display text-sm font-semibold text-[#F7F3EA]">
                            {subj.name}
                          </p>
                          <span className="font-mono-tabular text-xs text-[#D4AF70] shrink-0">
                            {subjPct}%
                          </span>
                        </div>
                        <p className="text-xs text-[#AAA6A0]">
                          {subj.category} · {subjChaps.length} chapter{subjChaps.length === 1 ? '' : 's'}
                          {subj.examDate ? ` · Exam ${subj.examDate}` : ''}
                        </p>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </SurfaceCard>
        </div>

        {/* Right Workspace: Selected Subject Details */}
        <div className="space-y-6 lg:col-span-8">
          {!activeSubject ? (
            <SurfaceCard className="p-8 text-center space-y-3">
              <BookOpen className="mx-auto h-8 w-8 text-[#D4AF70]" />
              <h3 className="font-display text-lg font-semibold text-[#F7F3EA]">
                Select or Create a Subject Workspace
              </h3>
              <p className="mx-auto max-w-md text-sm text-[#AAA6A0]">
                Each subject workspace maintains your chapters, uploaded notes, AI study guides, and Skill-Analysis-linked assessments.
              </p>
              <div>
                <Button onClick={openNewSubjectModal}>
                  <Plus className="h-4 w-4" />
                  Add Academic Subject
                </Button>
              </div>
            </SurfaceCard>
          ) : (
            <>
              {/* A. Subject Overview */}
              <SurfaceCard className="p-6 space-y-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium tracking-[0.12em] uppercase text-[#D4AF70]">
                      {activeSubject.category} · Skill Pillar:{' '}
                      {SKILL_CATEGORIES.find((c) => c.id === activeSubject.linkedSkillId)?.label ??
                        activeSubject.linkedSkillId}
                    </p>
                    <h3 className="font-display text-xl font-bold text-[#F7F3EA]">
                      {activeSubject.name}
                    </h3>
                    <p className="text-sm text-[#AAA6A0]">{activeSubject.description}</p>
                    {(activeSubject.examDate || activeSubject.targetGrade) && (
                      <p className="text-xs text-[#7D7973]">
                        {activeSubject.examDate ? `Exam Date: ${activeSubject.examDate}` : ''}
                        {activeSubject.examDate && activeSubject.targetGrade ? ' · ' : ''}
                        {activeSubject.targetGrade ? `Target Grade: ${activeSubject.targetGrade}` : ''}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openEditSubjectModal(activeSubject)}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDeleteSubjectClick(activeSubject)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-[rgba(212,175,112,0.14)] pt-4 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-[#7D7973]">Chapter Progress</p>
                    <p className="mt-1 font-mono-tabular text-xl font-semibold text-[#F5D78E]">
                      {chapterProgress}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#7D7973]">Completed / Total</p>
                    <p className="mt-1 font-mono-tabular text-xl font-semibold text-[#F7F3EA]">
                      {completedCount}/{activeChapters.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#7D7973]">Pending Chapters</p>
                    <p className="mt-1 font-mono-tabular text-xl font-semibold text-[#F7F3EA]">
                      {Math.max(0, activeChapters.length - completedCount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#7D7973]">Assessment Avg</p>
                    <p className="mt-1 font-mono-tabular text-xl font-semibold text-[#F7F3EA]">
                      {subjectAvgScore !== null ? `${subjectAvgScore}%` : 'Unassessed'}
                    </p>
                  </div>
                </div>

                <ProgressBar value={chapterProgress} label="Subject syllabus mastery" />

                <div className="flex flex-wrap gap-2.5 pt-1">
                  <Button
                    size="sm"
                    onClick={() => onOpenMaterialsForSubject(activeSubject.id)}
                  >
                    Generate Study Notes
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onStartAssessmentForSubject(activeSubject.id)}
                  >
                    Take Subject Assessment
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onAskAssistantForSubject(activeSubject.id)}
                  >
                    Ask AI Study Assistant
                  </Button>
                </div>
              </SurfaceCard>

              {/* B. Chapter Management */}
              <SurfaceCard className="p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="font-display text-base font-semibold text-[#F7F3EA]">
                      Chapter Management
                    </h4>
                    <p className="text-xs text-[#AAA6A0]">
                      Organize syllabus units, learning objectives, and key concepts
                    </p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={openNewChapterModal}>
                    <Plus className="h-3.5 w-3.5" />
                    Add Chapter
                  </Button>
                </div>

                {activeChapters.length === 0 ? (
                  <p className="rounded-lg border border-[rgba(212,175,112,0.12)] bg-[#11121A] p-4 text-xs text-[#AAA6A0]">
                    No chapters added to this subject yet. Add chapters to track progress and launch chapter-specific tests.
                  </p>
                ) : (
                  <div className="divide-y divide-[rgba(212,175,112,0.12)]">
                    {activeChapters.map((ch) => (
                      <div key={ch.id} className="py-4 first:pt-1 last:pb-1 space-y-2.5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => handleToggleChapterCompleted(ch)}
                              aria-label={`Mark chapter "${ch.title}" as ${
                                ch.completed ? 'incomplete' : 'completed'
                              }`}
                              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                                ch.completed
                                  ? 'border-[#D4AF70] bg-[#D4AF70] text-[#090A0F]'
                                  : 'border-[rgba(212,175,112,0.35)] bg-[#11121A] text-transparent hover:border-[#F5D78E]'
                              }`}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <div className="min-w-0 space-y-1">
                              <p
                                className={`font-display text-sm font-semibold ${
                                  ch.completed ? 'text-[#AAA6A0] line-through' : 'text-[#F7F3EA]'
                                }`}
                              >
                                Chapter {ch.orderIndex}: {ch.title}
                              </p>
                              <p className="text-xs text-[#AAA6A0]">
                                Est. {ch.estimatedHours}h
                                {ch.topics.length > 0 ? ` · Topics: ${ch.topics.join(', ')}` : ''}
                              </p>
                              {ch.importantConcepts.length > 0 && (
                                <p className="text-xs text-[#7D7973]">
                                  Core concepts: {ch.importantConcepts.join(' · ')}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => onOpenMaterialsForSubject(activeSubject.id, ch.id)}
                              className="rounded-md border border-[rgba(212,175,112,0.2)] px-2.5 py-1 text-xs text-[#D4AF70] hover:border-[#F5D78E] hover:text-[#F5D78E] whitespace-nowrap"
                            >
                              Notes
                            </button>
                            <button
                              type="button"
                              onClick={() => onStartAssessmentForSubject(activeSubject.id, ch.id)}
                              className="rounded-md border border-[rgba(212,175,112,0.2)] px-2.5 py-1 text-xs text-[#F7F3EA] hover:border-[#F5D78E] whitespace-nowrap"
                            >
                              Quiz
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditChapterModal(ch)}
                              aria-label={`Edit chapter ${ch.title}`}
                              className="rounded-md p-1.5 text-[#AAA6A0] hover:bg-[#20212B] hover:text-[#F7F3EA]"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteChapter(activeSubject.id, ch.id)}
                              aria-label={`Delete chapter ${ch.title}`}
                              className="rounded-md p-1.5 text-[#AAA6A0] hover:bg-[#2A1519] hover:text-[#F5B8B8]"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SurfaceCard>

              {/* C. Subject Resources */}
              <SurfaceCard className="p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="font-display text-base font-semibold text-[#F7F3EA]">
                      Subject Resources &amp; Uploads
                    </h4>
                    <p className="text-xs text-[#AAA6A0]">
                      Store study notes, upload course files (.txt, .md, .csv, .json, .pdf up to 200 KB), or save reference links
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg border border-[rgba(212,175,112,0.18)] bg-[#11121A] p-1">
                    {(['note', 'upload', 'link'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setResMode(m)}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors whitespace-nowrap ${
                          resMode === m
                            ? 'bg-[#20212B] text-[#F5D78E]'
                            : 'text-[#AAA6A0] hover:text-[#F7F3EA]'
                        }`}
                      >
                        {m === 'note' ? 'Study Note' : m === 'upload' ? 'Upload File' : 'Reference Link'}
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleSaveManualResource} className="space-y-3 rounded-lg border border-[rgba(212,175,112,0.14)] bg-[#11121A] p-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <TextInput
                      label="Resource Title"
                      placeholder="e.g., Week 3 Lecture Notes"
                      value={resTitle}
                      onChange={(e) => setResTitle(e.target.value)}
                    />
                    <TextInput
                      label="Topic"
                      placeholder="e.g., Eigenbasis"
                      value={resTopic}
                      onChange={(e) => setResTopic(e.target.value)}
                    />
                    <div className="space-y-1.5">
                      <label htmlFor="res-chapter-select" className="block text-xs font-medium text-[#AAA6A0]">
                        Chapter (Optional)
                      </label>
                      <select
                        id="res-chapter-select"
                        value={resChapterId}
                        onChange={(e) => setResChapterId(e.target.value)}
                        className="h-11 w-full rounded-lg border border-[rgba(212,175,112,0.2)] bg-[#171821] px-3 text-sm text-[#F7F3EA] focus:border-[#D4AF70] focus:outline-none"
                      >
                        <option value="">General Subject</option>
                        {activeChapters.map((ch) => (
                          <option key={ch.id} value={ch.id}>
                            Ch {ch.orderIndex}: {ch.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {resMode === 'upload' ? (
                    <div className="space-y-2">
                      <label
                        htmlFor="subject-file-upload"
                        className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[rgba(212,175,112,0.35)] bg-[#171821] px-4 py-5 text-xs text-[#F5D78E] hover:border-[#F5D78E]"
                      >
                        <Upload className="h-4 w-4" />
                        <span>
                          {savingResource
                            ? 'Processing upload...'
                            : 'Choose .txt, .md, .csv, .json, or .pdf file (max 200 KB)'}
                        </span>
                        <input
                          id="subject-file-upload"
                          type="file"
                          accept=".txt,.md,.csv,.json,.pdf"
                          onChange={handleFileUpload}
                          className="sr-only"
                        />
                      </label>
                    </div>
                  ) : (
                    <>
                      {resMode === 'link' && (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div className="sm:col-span-2">
                            <TextInput
                              label="Reference or Video URL"
                              placeholder="https://..."
                              value={resUrl}
                              onChange={(e) => setResUrl(e.target.value)}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label htmlFor="res-link-type" className="block text-xs font-medium text-[#AAA6A0]">
                              Resource Type
                            </label>
                            <select
                              id="res-link-type"
                              value={resLinkFormat}
                              onChange={(e) =>
                                setResLinkFormat(
                                  e.target.value as 'Reference Link' | 'Video Resource'
                                )
                              }
                              className="h-11 w-full rounded-lg border border-[rgba(212,175,112,0.2)] bg-[#171821] px-3 text-sm text-[#F7F3EA] focus:border-[#D4AF70] focus:outline-none"
                            >
                              <option value="Reference Link">Reference Link</option>
                              <option value="Video Resource">Video Resource</option>
                            </select>
                          </div>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label htmlFor="res-content-area" className="block text-xs font-medium text-[#AAA6A0]">
                          {resMode === 'link' ? 'Short Description' : 'Notes / Excerpt Content'}
                        </label>
                        <textarea
                          id="res-content-area"
                          rows={3}
                          placeholder={
                            resMode === 'link'
                              ? 'Key takeaways or section to review...'
                              : 'Paste lecture notes, formulas, or key definitions...'
                          }
                          value={resContent}
                          onChange={(e) => setResContent(e.target.value)}
                          className="w-full rounded-lg border border-[rgba(212,175,112,0.2)] bg-[#171821] px-3.5 py-2.5 text-sm text-[#F7F3EA] placeholder:text-[#6F6B66] focus:border-[#D4AF70] focus:outline-none"
                        />
                      </div>

                      <div className="flex justify-end">
                        <Button type="submit" size="sm" loading={savingResource}>
                          Save Resource
                        </Button>
                      </div>
                    </>
                  )}
                </form>

                {activeMaterials.length === 0 ? (
                  <p className="text-xs text-[#7D7973]">
                    No notes or uploaded resources saved for {activeSubject.name} yet.
                  </p>
                ) : (
                  <div className="divide-y divide-[rgba(212,175,112,0.12)]">
                    {activeMaterials.map((item) => (
                      <div key={item.id} className="flex items-start justify-between gap-4 py-3.5 first:pt-1 last:pb-1">
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5 shrink-0 text-[#D4AF70]" />
                            <p className="truncate font-display text-sm font-semibold text-[#F7F3EA]">
                              {item.title}
                            </p>
                          </div>
                          <p className="text-xs text-[#AAA6A0]">
                            {item.format} · {item.topic} · {item.createdAtLabel}
                            {item.fileName ? ` · File: ${item.fileName}` : ''}
                          </p>
                          <p className="line-clamp-2 text-xs text-[#7D7973]">{item.content}</p>
                          {item.externalUrl && (
                            <a
                              href={item.externalUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-[#D4AF70] hover:text-[#F5D78E]"
                            >
                              Open external resource
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => onDeleteMaterial(item.id)}
                          aria-label={`Delete resource ${item.title}`}
                          className="rounded-md p-1.5 text-[#AAA6A0] hover:bg-[#2A1519] hover:text-[#F5B8B8] shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </SurfaceCard>
            </>
          )}
        </div>
      </div>

      {/* Add / Edit Subject Modal */}
      <ModalDialog
        open={subjectModalOpen}
        title={editingSubject ? 'Edit Academic Subject' : 'Add Academic Subject'}
        onClose={() => setSubjectModalOpen(false)}
      >
        <form onSubmit={handleSaveSubject} className="space-y-4">
          <TextInput
            label="Subject Name"
            placeholder="e.g., Operating Systems & Concurrency"
            value={subjName}
            onChange={(e) => setSubjName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="subj-cat" className="block text-xs font-medium text-[#AAA6A0]">
                Category
              </label>
              <select
                id="subj-cat"
                value={subjCategory}
                onChange={(e) => {
                  const cat = e.target.value as AcademicSubjectCategory;
                  setSubjCategory(cat);
                  if (!editingSubject) setSubjSkill(suggestSkillForCategory(cat));
                }}
                className="h-11 w-full rounded-lg border border-[rgba(212,175,112,0.2)] bg-[#11121A] px-3 text-sm text-[#F7F3EA] focus:border-[#D4AF70] focus:outline-none"
              >
                {SUBJECT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="subj-skill" className="block text-xs font-medium text-[#AAA6A0]">
                Linked Skill Analysis Pillar
              </label>
              <select
                id="subj-skill"
                value={subjSkill}
                onChange={(e) => setSubjSkill(e.target.value as SkillCategoryId)}
                className="h-11 w-full rounded-lg border border-[rgba(212,175,112,0.2)] bg-[#11121A] px-3 text-sm text-[#F7F3EA] focus:border-[#D4AF70] focus:outline-none"
              >
                {SKILL_CATEGORIES.map((sk) => (
                  <option key={sk.id} value={sk.id}>
                    {sk.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextInput
              label="Target Exam Date (Optional)"
              type="date"
              value={subjExamDate}
              onChange={(e) => setSubjExamDate(e.target.value)}
            />
            <TextInput
              label="Target Grade (Optional)"
              placeholder="e.g., A or 90%"
              value={subjTargetGrade}
              onChange={(e) => setSubjTargetGrade(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="subj-desc" className="block text-xs font-medium text-[#AAA6A0]">
              Subject Scope / Description
            </label>
            <textarea
              id="subj-desc"
              rows={3}
              placeholder="Core topics, syllabus goals, or course focus..."
              value={subjDesc}
              onChange={(e) => setSubjDesc(e.target.value)}
              className="w-full rounded-lg border border-[rgba(212,175,112,0.2)] bg-[#11121A] px-3.5 py-2.5 text-sm text-[#F7F3EA] placeholder:text-[#6F6B66] focus:border-[#D4AF70] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setSubjectModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={savingSubject}>
              {editingSubject ? 'Save Changes' : 'Create Subject'}
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* Add / Edit Chapter Modal */}
      <ModalDialog
        open={chapterModalOpen}
        title={editingChapter ? 'Edit Chapter' : 'Add Chapter'}
        onClose={() => setChapterModalOpen(false)}
      >
        <form onSubmit={handleSaveChapter} className="space-y-4">
          <TextInput
            label="Chapter Title"
            placeholder="e.g., Virtual Memory & Page Replacement"
            value={chapTitle}
            onChange={(e) => setChapTitle(e.target.value)}
            required
          />
          <TextInput
            label="Topics (comma-separated)"
            placeholder="e.g., Paging, TLB, LRU Policy"
            value={chapTopics}
            onChange={(e) => setChapTopics(e.target.value)}
          />
          <TextInput
            label="Learning Objectives (semicolon-separated)"
            placeholder="e.g., Compare Belady anomaly across policies; Calculate effective access time"
            value={chapObjectives}
            onChange={(e) => setChapObjectives(e.target.value)}
          />
          <TextInput
            label="Important Concepts (semicolon-separated)"
            placeholder="e.g., Page fault overhead; Working set locality"
            value={chapConcepts}
            onChange={(e) => setChapConcepts(e.target.value)}
          />
          <TextInput
            label="Estimated Study Hours"
            type="number"
            min={1}
            max={100}
            value={chapHours}
            onChange={(e) => setChapHours(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setChapterModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={savingChapter}>
              {editingChapter ? 'Save Chapter' : 'Add Chapter'}
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}
