import React, { useMemo, useRef, useState } from 'react';
import { Bot, Send } from 'lucide-react';
import { auth } from '../../lib/firebase';
import type {
  AcademicChapter,
  AcademicSubject,
  MentorMessage,
  StudentProfile,
  StudyMaterialItem,
} from '../../types/skillpath';
import { postJson } from '../../utils/apiClient';
import { calculateOverallReadiness, getCareerById } from '../../utils/skillAnalytics';
import { Button, SurfaceCard, ToastBanner } from '../ui/DesignSystem';

interface ChatApiResponse {
  agentUsed: string;
  agentLabel: string;
  coordinationSummary: string;
  reply: string;
  actionableSteps: string[];
  followUpQuestions: string[];
}

interface AiStudyAssistantViewProps {
  profile: StudentProfile;
  subjects: AcademicSubject[];
  chapters: AcademicChapter[];
  materials: StudyMaterialItem[];
  weakTopicsBySubject: Record<string, string[]>;
  isDemo: boolean;
  defaultSubjectId?: string | null;
  defaultTopic?: string;
}

const QUICK_PROMPTS = [
  'Explain this topic intuitively using a step-by-step example.',
  'Walk me through solving a typical problem and highlight common mistakes.',
  'Break down the core formulas and rules I must remember for exams.',
  'Summarize my study context and give me 3 active-recall questions.',
];

export function AiStudyAssistantView({
  profile,
  subjects,
  chapters,
  materials,
  weakTopicsBySubject,
  isDemo,
  defaultSubjectId,
  defaultTopic = '',
}: AiStudyAssistantViewProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    defaultSubjectId || subjects[0]?.id || ''
  );
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [topicFocus, setTopicFocus] = useState<string>(defaultTopic);
  const [messages, setMessages] = useState<MentorMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

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

  const subjectExcerpt = useMemo(() => {
    const relevant = materials.filter((m) => m.subjectId === effectiveSubjectId);
    if (relevant.length === 0) return '';
    return relevant[0].content.slice(0, 1500);
  }, [materials, effectiveSubjectId]);

  const career = getCareerById(profile.selectedCareerId);
  const readiness = calculateOverallReadiness(profile.skillScores, career);

  const sendMessage = async (rawText: string) => {
    const clean = rawText.trim();
    if (clean.length < 2 || sending) return;

    setErrorMsg(null);
    const userTurn: MentorMessage = {
      id: `acad-msg-${Date.now()}-u`,
      sender: 'user',
      content: clean,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const nextHistory = [...messages, userTurn];
    setMessages(nextHistory);
    setInput('');
    setSending(true);

    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 30);

    try {
      const headers: Record<string, string> = {};
      if (!isDemo && auth.currentUser) {
        headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
      }

      const data = await postJson<ChatApiResponse>(
        '/api/chat',
        {
          mode: isDemo ? 'demo' : 'live',
          agentRole: 'technical_tutor',
          message: clean,
          history: messages.slice(-10).map((m) => ({ sender: m.sender, content: m.content })),
          studentContext: {
            displayName: profile.displayName,
            academicTrack: profile.academicTrack,
            institution: profile.institution,
            graduationYear: profile.graduationYear,
            selectedCareerTitle: career.title,
            readinessScore: readiness,
            weeklyStudyHours: profile.weeklyStudyHours,
            skillScores: profile.skillScores,
            completedMilestones: profile.completedMilestones,
            careerInterests: profile.careerInterests,
            academicContext: activeSubject
              ? {
                  subjectName: activeSubject.name,
                  subjectCategory: activeSubject.category,
                  chapterTitle: activeChapter?.title,
                  topic:
                    topicFocus.trim() ||
                    activeChapter?.topics[0] ||
                    activeChapter?.title ||
                    activeSubject.name,
                  weakTopics: weakTopicsBySubject[activeSubject.id] ?? [],
                  sourceExcerpt: subjectExcerpt || undefined,
                }
              : undefined,
          },
        },
        headers,
        'AI Study Assistant could not respond.'
      );

      const agentTurn: MentorMessage = {
        id: `acad-msg-${Date.now()}-a`,
        sender: 'agent',
        agentLabel: data.agentLabel || 'Academic Study Assistant',
        coordinationSummary: data.coordinationSummary,
        content: data.reply,
        actionableSteps: data.actionableSteps,
        followUpQuestions: data.followUpQuestions,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages([...nextHistory, agentTurn]);
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 30);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to reach AI Study Assistant.'
      );
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  return (
    <div className="space-y-6">
      {errorMsg && (
        <ToastBanner tone="error" message={errorMsg} onDismiss={() => setErrorMsg(null)} />
      )}

      {/* Active Subject & Chapter Grounding Bar */}
      <SurfaceCard className="p-5 space-y-4">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-medium tracking-[0.12em] uppercase text-[#D4AF70]">
              Context-Grounded Academic Tutoring
            </p>
            <h3 className="font-display text-base font-semibold text-[#F7F3EA]">
              AI Study Assistant
            </h3>
          </div>
          <p className="text-xs text-[#AAA6A0]">
            Connected to SkillPath AI multi-agent backend with your active subject &amp; weakness telemetry
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor="assist-subject" className="block text-xs font-medium text-[#AAA6A0]">
              Active Subject
            </label>
            <select
              id="assist-subject"
              value={effectiveSubjectId}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value);
                setSelectedChapterId('');
              }}
              className="h-10 w-full rounded-lg border border-[rgba(212,175,112,0.2)] bg-[#11121A] px-3 text-xs text-[#F7F3EA] focus:border-[#D4AF70] focus:outline-none"
            >
              {subjects.length === 0 ? (
                <option value="">General Academic Support</option>
              ) : (
                subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="assist-chapter" className="block text-xs font-medium text-[#AAA6A0]">
              Chapter Context
            </label>
            <select
              id="assist-chapter"
              value={selectedChapterId}
              onChange={(e) => setSelectedChapterId(e.target.value)}
              className="h-10 w-full rounded-lg border border-[rgba(212,175,112,0.2)] bg-[#11121A] px-3 text-xs text-[#F7F3EA] focus:border-[#D4AF70] focus:outline-none"
            >
              <option value="">All Chapters</option>
              {subjectChapters.map((c) => (
                <option key={c.id} value={c.id}>
                  Ch {c.orderIndex}: {c.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="assist-topic" className="block text-xs font-medium text-[#AAA6A0]">
              Specific Topic / Concept
            </label>
            <input
              id="assist-topic"
              type="text"
              placeholder="e.g., Gauss Law symmetry"
              value={topicFocus}
              onChange={(e) => setTopicFocus(e.target.value)}
              className="h-10 w-full rounded-lg border border-[rgba(212,175,112,0.2)] bg-[#11121A] px-3 text-xs text-[#F7F3EA] placeholder:text-[#6F6B66] focus:border-[#D4AF70] focus:outline-none"
            />
          </div>
        </div>
      </SurfaceCard>

      {/* Conversation Surface */}
      <SurfaceCard className="flex flex-col overflow-hidden">
        <div ref={scrollRef} className="max-h-[460px] min-h-[300px] space-y-4 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 text-sm text-[#F7F3EA]">
                <Bot className="h-4 w-4 text-[#D4AF70]" />
                <span>
                  Ask a question about{' '}
                  <strong className="text-[#F5D78E]">
                    {activeSubject?.name || 'your coursework'}
                  </strong>
                  {activeChapter ? ` (${activeChapter.title})` : ''} or pick a quick study prompt:
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void sendMessage(q)}
                    className="rounded-lg border border-[rgba(212,175,112,0.18)] bg-[#11121A] p-3 text-left text-xs text-[#AAA6A0] transition-colors hover:border-[#D4AF70] hover:text-[#F7F3EA]"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((turn) => (
              <div
                key={turn.id}
                className={`rounded-xl border p-4 space-y-2.5 ${
                  turn.sender === 'user'
                    ? 'ml-auto max-w-[85%] border-[rgba(212,175,112,0.3)] bg-[#20212B]'
                    : 'mr-auto max-w-[92%] border-[rgba(212,175,112,0.16)] bg-[#11121A]'
                }`}
              >
                <div className="flex items-center justify-between gap-4 text-[11px] text-[#7D7973]">
                  <span className="font-medium text-[#D4AF70]">
                    {turn.sender === 'user'
                      ? profile.displayName
                      : turn.agentLabel || 'Academic Study Assistant'}
                  </span>
                  <span>{turn.timestamp}</span>
                </div>

                {turn.coordinationSummary && (
                  <p className="text-[11px] text-[#AAA6A0] italic">{turn.coordinationSummary}</p>
                )}

                <div className="whitespace-pre-wrap text-sm leading-relaxed text-[#F7F3EA]">
                  {turn.content}
                </div>

                {turn.actionableSteps && turn.actionableSteps.length > 0 && (
                  <div className="border-t border-[rgba(212,175,112,0.12)] pt-2">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#F5D78E]">
                      Next Study Actions
                    </p>
                    <ul className="list-disc space-y-1 pl-4 text-xs text-[#AAA6A0]">
                      {turn.actionableSteps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {turn.followUpQuestions && turn.followUpQuestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {turn.followUpQuestions.map((fq, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => void sendMessage(fq)}
                        className="rounded-md border border-[rgba(212,175,112,0.22)] bg-[#171821] px-2.5 py-1 text-left text-[11px] text-[#D4AF70] hover:border-[#F5D78E] hover:text-[#F5D78E]"
                      >
                        {fq}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}

          {sending && (
            <div className="rounded-xl border border-[rgba(212,175,112,0.16)] bg-[#11121A] p-4 text-xs text-[#AAA6A0]">
              Analyzing subject context and formulating step-by-step response...
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 border-t border-[rgba(212,175,112,0.14)] bg-[#11121A] p-4"
        >
          <input
            type="text"
            aria-label="Ask the AI Study Assistant"
            placeholder="Ask a conceptual question, paste a problem step, or request simplified examples..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
            className="h-11 flex-1 rounded-lg border border-[rgba(212,175,112,0.2)] bg-[#171821] px-3.5 text-sm text-[#F7F3EA] placeholder:text-[#6F6B66] focus:border-[#D4AF70] focus:outline-none"
          />
          <Button type="submit" loading={sending} disabled={input.trim().length < 2}>
            <Send className="h-4 w-4" />
            Ask
          </Button>
        </form>
      </SurfaceCard>
    </div>
  );
}
