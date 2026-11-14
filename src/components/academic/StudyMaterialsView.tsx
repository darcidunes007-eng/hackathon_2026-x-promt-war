import React, { useMemo, useState } from 'react';
import { BookMarked, Sparkles, Trash2 } from 'lucide-react';
import { auth } from '../../lib/firebase';
import type {
  AcademicChapter,
  AcademicSubject,
  ExplanationLevel,
  StudyMaterialFormat,
  StudyMaterialItem,
} from '../../types/skillpath';
import { postJson } from '../../utils/apiClient';
import { Button, SurfaceCard, TextInput, ToastBanner } from '../ui/DesignSystem';

const MATERIAL_FORMATS: StudyMaterialFormat[] = [
  'Explanation',
  'Detailed Notes',
  'Definitions',
  'Formula Sheet',
  'Concept Summary',
  'Revision Notes',
  'Real-World Examples',
  'Frequently Tested',
  'Practice Questions',
  'Chapter Summary',
];

const EXPLANATION_LEVELS: ExplanationLevel[] = [
  'Beginner',
  'Intermediate',
  'Advanced',
  'Exam Preparation',
];

interface GeneratedMaterialPreview {
  title: string;
  content: string;
  keyDefinitions: string[];
  formulasOrRules: string[];
  realWorldExamples: string[];
  practicePrompts: string[];
  aiDisclaimer: string;
}

interface StudyMaterialsViewProps {
  subjects: AcademicSubject[];
  chapters: AcademicChapter[];
  materials: StudyMaterialItem[];
  isDemo: boolean;
  defaultSubjectId?: string | null;
  defaultChapterId?: string | null;
  defaultTopic?: string;
  onSaveMaterial: (
    input: Omit<StudyMaterialItem, 'id' | 'uid' | 'createdAtLabel'>
  ) => Promise<string>;
  onDeleteMaterial: (materialId: string) => Promise<void>;
}

export function StudyMaterialsView({
  subjects,
  chapters,
  materials,
  isDemo,
  defaultSubjectId,
  defaultChapterId,
  defaultTopic = '',
  onSaveMaterial,
  onDeleteMaterial,
}: StudyMaterialsViewProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    defaultSubjectId || subjects[0]?.id || ''
  );
  const [selectedChapterId, setSelectedChapterId] = useState<string>(defaultChapterId || '');
  const [topic, setTopic] = useState(defaultTopic);
  const [level, setLevel] = useState<ExplanationLevel>('Intermediate');
  const [format, setFormat] = useState<StudyMaterialFormat>('Detailed Notes');
  const [sourceMaterialId, setSourceMaterialId] = useState<string>('');
  const [customExcerpt, setCustomExcerpt] = useState('');

  const [generating, setGenerating] = useState(false);
  const [savingPreview, setSavingPreview] = useState(false);
  const [preview, setPreview] = useState<GeneratedMaterialPreview | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [filterSubjectId, setFilterSubjectId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const effectiveSubjectId = selectedSubjectId || subjects[0]?.id || '';
  const activeSubject = subjects.find((s) => s.id === effectiveSubjectId) ?? null;

  const subjectChapters = useMemo(
    () =>
      chapters
        .filter((c) => c.subjectId === effectiveSubjectId)
        .sort((a, b) => a.orderIndex - b.orderIndex),
    [chapters, effectiveSubjectId]
  );

  const activeChapter = subjectChapters.find((c) => c.id === selectedChapterId) ?? null;

  const subjectSourceMaterials = useMemo(
    () =>
      materials.filter(
        (m) => m.subjectId === effectiveSubjectId && m.sourceType !== 'ai_generated'
      ),
    [materials, effectiveSubjectId]
  );

  const filteredLibrary = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return materials.filter((item) => {
      if (filterSubjectId !== 'all' && item.subjectId !== filterSubjectId) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.topic.toLowerCase().includes(q) ||
        item.format.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q)
      );
    });
  }, [materials, filterSubjectId, searchQuery]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubject) {
      setErrorMsg('Create or select a subject first before generating study material.');
      return;
    }
    const cleanTopic =
      topic.trim() ||
      activeChapter?.topics[0] ||
      activeChapter?.title ||
      activeSubject.name;

    if (cleanTopic.length < 2) {
      setErrorMsg('Enter a topic of at least 2 characters.');
      return;
    }

    setGenerating(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const headers: Record<string, string> = {};
      if (!isDemo && auth.currentUser) {
        headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
      }

      const selectedSource = subjectSourceMaterials.find((m) => m.id === sourceMaterialId);
      const combinedExcerpt = [selectedSource?.content, customExcerpt.trim()]
        .filter(Boolean)
        .join('\n\n')
        .slice(0, 3500);

      const data = await postJson<GeneratedMaterialPreview>(
        '/api/ai/study-material',
        {
          mode: isDemo ? 'demo' : 'live',
          subjectName: activeSubject.name,
          subjectCategory: activeSubject.category,
          chapterTitle: activeChapter?.title,
          topic: cleanTopic,
          level,
          format,
          sourceMaterialExcerpt: combinedExcerpt || undefined,
        },
        headers,
        'Unable to generate study material.'
      );

      setPreview(data);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to generate AI study material right now.'
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleSavePreviewToLibrary = async () => {
    if (!preview || !activeSubject) return;
    setSavingPreview(true);
    setErrorMsg(null);
    try {
      const sections: string[] = [preview.content];
      if (preview.keyDefinitions.length > 0) {
        sections.push(`Key Definitions:\n- ${preview.keyDefinitions.join('\n- ')}`);
      }
      if (preview.formulasOrRules.length > 0) {
        sections.push(`Formulas & Core Rules:\n- ${preview.formulasOrRules.join('\n- ')}`);
      }
      if (preview.realWorldExamples.length > 0) {
        sections.push(`Examples:\n- ${preview.realWorldExamples.join('\n- ')}`);
      }
      if (preview.practicePrompts.length > 0) {
        sections.push(`Practice Prompts:\n- ${preview.practicePrompts.join('\n- ')}`);
      }

      await onSaveMaterial({
        subjectId: activeSubject.id,
        chapterId: activeChapter?.id,
        topic: topic.trim() || activeChapter?.title || activeSubject.name,
        title: preview.title,
        format,
        level,
        content: sections.join('\n\n'),
        sourceType: 'ai_generated',
        aiDisclaimer: preview.aiDisclaimer,
      });

      setSuccessMsg(`Saved "${preview.title}" to your Learning Materials library.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save study material.');
    } finally {
      setSavingPreview(false);
    }
  };

  return (
    <div className="space-y-6">
      {errorMsg && (
        <ToastBanner tone="error" message={errorMsg} onDismiss={() => setErrorMsg(null)} />
      )}
      {successMsg && (
        <ToastBanner tone="success" message={successMsg} onDismiss={() => setSuccessMsg(null)} />
      )}

      {/* Generator Panel */}
      <SurfaceCard className="p-6 space-y-5">
        <div className="flex flex-col justify-between gap-2 border-b border-[rgba(212,175,112,0.14)] pb-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-medium tracking-[0.12em] uppercase text-[#D4AF70]">
              Gemini Study Material Synthesizer
            </p>
            <h3 className="font-display text-lg font-semibold text-[#F7F3EA]">
              Generate Level-Adaptive Study Guides &amp; Notes
            </h3>
            <p className="text-xs text-[#AAA6A0]">
              All generated notes are grounded in foundational academic principles and your uploaded excerpts, clearly labeled as AI-generated study material.
            </p>
          </div>
        </div>

        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <label htmlFor="mat-subject" className="block text-xs font-medium text-[#AAA6A0]">
                Subject
              </label>
              <select
                id="mat-subject"
                value={effectiveSubjectId}
                onChange={(e) => {
                  setSelectedSubjectId(e.target.value);
                  setSelectedChapterId('');
                  setSourceMaterialId('');
                }}
                className="h-11 w-full rounded-lg border border-[rgba(212,175,112,0.2)] bg-[#11121A] px-3 text-sm text-[#F7F3EA] focus:border-[#D4AF70] focus:outline-none"
              >
                {subjects.length === 0 ? (
                  <option value="">No subjects yet</option>
                ) : (
                  subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="mat-chapter" className="block text-xs font-medium text-[#AAA6A0]">
                Chapter
              </label>
              <select
                id="mat-chapter"
                value={selectedChapterId}
                onChange={(e) => setSelectedChapterId(e.target.value)}
                className="h-11 w-full rounded-lg border border-[rgba(212,175,112,0.2)] bg-[#11121A] px-3 text-sm text-[#F7F3EA] focus:border-[#D4AF70] focus:outline-none"
              >
                <option value="">General Subject Scope</option>
                {subjectChapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    Ch {c.orderIndex}: {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="mat-level" className="block text-xs font-medium text-[#AAA6A0]">
                Explanation Level
              </label>
              <select
                id="mat-level"
                value={level}
                onChange={(e) => setLevel(e.target.value as ExplanationLevel)}
                className="h-11 w-full rounded-lg border border-[rgba(212,175,112,0.2)] bg-[#11121A] px-3 text-sm text-[#F7F3EA] focus:border-[#D4AF70] focus:outline-none"
              >
                {EXPLANATION_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="mat-format" className="block text-xs font-medium text-[#AAA6A0]">
                Study Format
              </label>
              <select
                id="mat-format"
                value={format}
                onChange={(e) => setFormat(e.target.value as StudyMaterialFormat)}
                className="h-11 w-full rounded-lg border border-[rgba(212,175,112,0.2)] bg-[#11121A] px-3 text-sm text-[#F7F3EA] focus:border-[#D4AF70] focus:outline-none"
              >
                {MATERIAL_FORMATS.map((fmt) => (
                  <option key={fmt} value={fmt}>
                    {fmt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TextInput
              label="Focus Topic"
              placeholder={
                activeChapter?.topics[0] ||
                activeChapter?.title ||
                'e.g., Gauss Law symmetry surfaces or Spectral Theorem'
              }
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />

            <div className="space-y-1.5">
              <label htmlFor="mat-source-doc" className="block text-xs font-medium text-[#AAA6A0]">
                Ground in Uploaded Note/File (Optional)
              </label>
              <select
                id="mat-source-doc"
                value={sourceMaterialId}
                onChange={(e) => setSourceMaterialId(e.target.value)}
                className="h-11 w-full rounded-lg border border-[rgba(212,175,112,0.2)] bg-[#11121A] px-3 text-sm text-[#F7F3EA] focus:border-[#D4AF70] focus:outline-none"
              >
                <option value="">None — synthesize from core curriculum principles</option>
                {subjectSourceMaterials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title} ({m.format})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="mat-excerpt" className="block text-xs font-medium text-[#AAA6A0]">
              Additional Lecture Excerpt or Question Prompt (Optional)
            </label>
            <textarea
              id="mat-excerpt"
              rows={2}
              placeholder="Paste specific definitions or problem context you want simplified or converted into a formula sheet..."
              value={customExcerpt}
              onChange={(e) => setCustomExcerpt(e.target.value)}
              className="w-full rounded-lg border border-[rgba(212,175,112,0.2)] bg-[#11121A] px-3.5 py-2.5 text-sm text-[#F7F3EA] placeholder:text-[#6F6B66] focus:border-[#D4AF70] focus:outline-none"
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" loading={generating} disabled={!activeSubject}>
              <Sparkles className="h-4 w-4" />
              {generating ? 'Synthesizing Study Material...' : `Generate ${format}`}
            </Button>
          </div>
        </form>

        {preview && (
          <div className="mt-4 space-y-4 rounded-xl border border-[rgba(245,215,142,0.35)] bg-[#11121A] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[rgba(212,175,112,0.14)] pb-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#D4AF70]">
                  AI-Generated Study Material · {level} · {format}
                </p>
                <h4 className="mt-1 font-display text-base font-semibold text-[#F7F3EA]">
                  {preview.title}
                </h4>
              </div>
              <Button size="sm" loading={savingPreview} onClick={handleSavePreviewToLibrary}>
                <BookMarked className="h-3.5 w-3.5" />
                Save to Library
              </Button>
            </div>

            <div className="whitespace-pre-wrap text-sm leading-relaxed text-[#F7F3EA]">
              {preview.content}
            </div>

            {preview.keyDefinitions.length > 0 && (
              <div className="space-y-1.5 border-t border-[rgba(212,175,112,0.12)] pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#F5D78E]">
                  Key Definitions
                </p>
                <ul className="list-disc space-y-1 pl-5 text-xs text-[#AAA6A0]">
                  {preview.keyDefinitions.map((def, i) => (
                    <li key={i}>{def}</li>
                  ))}
                </ul>
              </div>
            )}

            {preview.formulasOrRules.length > 0 && (
              <div className="space-y-1.5 border-t border-[rgba(212,175,112,0.12)] pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#F5D78E]">
                  Formulas &amp; Rules
                </p>
                <ul className="list-disc space-y-1 pl-5 text-xs text-[#F7F3EA]">
                  {preview.formulasOrRules.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}

            {preview.realWorldExamples.length > 0 && (
              <div className="space-y-1.5 border-t border-[rgba(212,175,112,0.12)] pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#F5D78E]">
                  Applied Examples
                </p>
                <ul className="list-disc space-y-1 pl-5 text-xs text-[#AAA6A0]">
                  {preview.realWorldExamples.map((ex, i) => (
                    <li key={i}>{ex}</li>
                  ))}
                </ul>
              </div>
            )}

            {preview.practicePrompts.length > 0 && (
              <div className="space-y-1.5 border-t border-[rgba(212,175,112,0.12)] pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#F5D78E]">
                  Practice Checkpoints
                </p>
                <ul className="list-decimal space-y-1 pl-5 text-xs text-[#AAA6A0]">
                  {preview.practicePrompts.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="border-t border-[rgba(212,175,112,0.12)] pt-2 text-[11px] text-[#7D7973]">
              {preview.aiDisclaimer}
            </p>
          </div>
        )}
      </SurfaceCard>

      {/* Saved Study Materials Library */}
      <SurfaceCard className="p-6 space-y-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h3 className="font-display text-base font-semibold text-[#F7F3EA]">
              Saved Learning Materials Library
            </h3>
            <p className="text-xs text-[#AAA6A0]">
              {filteredLibrary.length} material{filteredLibrary.length === 1 ? '' : 's'} across uploaded documents, notes, and AI guides
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter materials by subject"
              value={filterSubjectId}
              onChange={(e) => setFilterSubjectId(e.target.value)}
              className="h-9 rounded-lg border border-[rgba(212,175,112,0.2)] bg-[#11121A] px-3 text-xs text-[#F7F3EA] focus:border-[#D4AF70] focus:outline-none"
            >
              <option value="all">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <input
              type="search"
              aria-label="Search study materials"
              placeholder="Search topic or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 rounded-lg border border-[rgba(212,175,112,0.2)] bg-[#11121A] px-3 text-xs text-[#F7F3EA] placeholder:text-[#6F6B66] focus:border-[#D4AF70] focus:outline-none"
            />
          </div>
        </div>

        {filteredLibrary.length === 0 ? (
          <p className="rounded-lg border border-[rgba(212,175,112,0.12)] bg-[#11121A] p-4 text-xs text-[#AAA6A0]">
            No learning materials match your current filter. Generate a study guide above or upload notes in My Subjects.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredLibrary.map((item) => {
              const subjName =
                subjects.find((s) => s.id === item.subjectId)?.name ?? 'Subject';
              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-lg border border-[rgba(212,175,112,0.16)] bg-[#11121A] p-4 space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[11px] font-medium text-[#D4AF70]">
                        {subjName} · {item.format} · {item.level}
                        {item.sourceType === 'ai_generated' ? ' · AI-Generated' : ' · Student Resource'}
                      </p>
                      <button
                        type="button"
                        onClick={() => onDeleteMaterial(item.id)}
                        aria-label={`Delete ${item.title}`}
                        className="rounded p-1 text-[#7D7973] hover:bg-[#2A1519] hover:text-[#F5B8B8]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <h4 className="font-display text-sm font-semibold text-[#F7F3EA]">
                      {item.title}
                    </h4>
                    <p className="text-xs text-[#AAA6A0] whitespace-pre-wrap line-clamp-5">
                      {item.content}
                    </p>
                  </div>
                  <p className="text-[11px] text-[#7D7973]">
                    Topic: {item.topic} · {item.createdAtLabel}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}
