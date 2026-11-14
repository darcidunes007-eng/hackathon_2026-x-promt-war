import React, { useEffect, useRef, useState } from 'react';
import { Bot, Plus, RefreshCw, Send, Trash2 } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { formatFirestoreUserMessage } from '../../lib/studentService';
import type {
  MentorAgentRole,
  MentorMessage,
  MentorSession,
  StudentProfile,
} from '../../types/skillpath';
import {
  calculateOverallReadiness,
  calculateRoadmapProgress,
  getCareerById,
} from '../../utils/skillAnalytics';
import { Button, SurfaceCard, ToastBanner } from '../ui/DesignSystem';

interface AiMentorViewProps {
  profile: StudentProfile;
  sessions: MentorSession[];
  isDemo: boolean;
  onPersistSession: (
    sessionId: string | null,
    agentRole: MentorAgentRole,
    title: string,
    messages: MentorMessage[]
  ) => Promise<string | null>;
  onDeleteSession?: (sessionId: string) => Promise<void>;
}

const AGENTS: Array<{
  id: MentorAgentRole;
  label: string;
  subtitle: string;
}> = [
  {
    id: 'orchestrator',
    label: 'Auto Orchestrator',
    subtitle: 'Routes & coordinates all 4 specialists',
  },
  {
    id: 'career_strategist',
    label: 'Career Strategist',
    subtitle: 'Role alignment & portfolio positioning',
  },
  {
    id: 'curriculum_architect',
    label: 'Curriculum Architect',
    subtitle: 'Stage pacing & milestone sequencing',
  },
  {
    id: 'technical_tutor',
    label: 'Technical Tutor',
    subtitle: 'Deep engineering & academic rigor',
  },
  {
    id: 'assessment_coach',
    label: 'Assessment Coach',
    subtitle: 'Gap diagnosis & practice drills',
  },
];

const STARTER_PROMPTS = [
  'Which milestone in my active roadmap delivers the highest readiness lift this month?',
  'Explain how to design an evaluation harness for hybrid semantic + lexical retrieval.',
  'Review my current skill gaps and build a realistic 14-hour weekly study cadence.',
];

export function AiMentorView({
  profile,
  sessions,
  isDemo,
  onPersistSession,
  onDeleteSession,
}: AiMentorViewProps) {
  const [selectedAgent, setSelectedAgent] = useState<MentorAgentRole>('orchestrator');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MentorMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const career = getCareerById(profile.selectedCareerId);
  const readiness = calculateOverallReadiness(profile.skillScores, career);
  const roadmap = calculateRoadmapProgress(profile.completedMilestones, career);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  const handleLoadSession = (session: MentorSession) => {
    setActiveSessionId(session.id);
    setSelectedAgent(session.agentRole);
    setMessages(session.messages);
    setErrorMsg(null);
  };

  const handleNewSession = () => {
    setActiveSessionId(null);
    setMessages([]);
    setErrorMsg(null);
    setLastFailedPrompt(null);
  };

  const sendPrompt = async (promptText: string) => {
    const clean = promptText.trim();
    if (clean.length < 2 || sending) return;

    setErrorMsg(null);
    setLastFailedPrompt(null);

    const userTurn: MentorMessage = {
      id: `msg-${Date.now()}-u`,
      sender: 'user',
      content: clean,
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    const nextMessages = [...messages, userTurn];
    setMessages(nextMessages);
    setInput('');
    setSending(true);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (!isDemo && auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch('/api/ai/mentor', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          mode: isDemo ? 'demo' : 'live',
          message: clean,
          agentRole: selectedAgent,
          history: nextMessages.slice(-10).map((m) => ({
            sender: m.sender,
            content: m.content,
          })),
          studentContext: {
            displayName: profile.displayName,
            academicTrack: profile.academicTrack,
            institution: profile.institution,
            graduationYear: profile.graduationYear,
            selectedCareerTitle: career.title,
            readinessScore: readiness,
            roadmapPercent: roadmap.percentage,
            weeklyStudyHours: profile.weeklyStudyHours,
            skillScores: profile.skillScores,
            completedMilestones: profile.completedMilestones,
            careerInterests: profile.careerInterests,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gemini AI Mentor request failed.');
      }

      const agentTurn: MentorMessage = {
        id: `msg-${Date.now()}-a`,
        sender: 'agent',
        agentRole: data.agentUsed,
        agentLabel: data.agentLabel,
        coordinationSummary: data.coordinationSummary,
        content: data.reply,
        actionableSteps: Array.isArray(data.actionableSteps) ? data.actionableSteps : [],
        followUpQuestions: Array.isArray(data.followUpQuestions)
          ? data.followUpQuestions
          : [],
        timestamp: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      const updatedThread = [...nextMessages, agentTurn];
      setMessages(updatedThread);

      const sessionTitle = updatedThread[0]?.content.slice(0, 64).trim() || 'Mentor Consultation';
      try {
        const savedId = await onPersistSession(
          activeSessionId,
          selectedAgent,
          sessionTitle,
          updatedThread
        );
        if (savedId) setActiveSessionId(savedId);
      } catch (persistErr) {
        setErrorMsg(
          `Response generated, but conversation history could not be saved: ${formatFirestoreUserMessage(
            persistErr
          )}`
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to reach AI Mentor backend.';
      setErrorMsg(msg);
      setLastFailedPrompt(clean);
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendPrompt(input);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-[rgba(212,175,112,0.14)] pb-5 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <p className="text-xs font-medium tracking-[0.12em] uppercase text-[#D4AF70]">
            Multi-Agent Gemini Architecture
          </p>
          <h2 className="font-display text-2xl font-bold text-[#F7F3EA]">AI Mentor</h2>
          <p className="text-sm text-[#AAA6A0]">
            Context-aware guidance grounded in your {career.title} roadmap and skill telemetry.
          </p>
        </div>

        <Button size="sm" variant="secondary" onClick={handleNewSession}>
          <Plus className="h-3.5 w-3.5" />
          New Consultation
        </Button>
      </div>

      {/* Specialist Agent Selector */}
      <div
        role="tablist"
        aria-label="Select specialist mentor agent"
        className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5"
      >
        {AGENTS.map((agent) => {
          const active = selectedAgent === agent.id;
          return (
            <button
              key={agent.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSelectedAgent(agent.id)}
              className={`rounded-lg border p-3 text-left transition-all ${
                active
                  ? 'border-[#D4AF70] bg-[#171821] text-[#F7F3EA]'
                  : 'border-[rgba(212,175,112,0.14)] bg-[#11121A] text-[#AAA6A0] hover:border-[rgba(212,175,112,0.3)] hover:text-[#F7F3EA]'
              }`}
            >
              <p className="font-display text-xs font-semibold text-[#F5D78E]">
                {agent.label}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-[#AAA6A0]">{agent.subtitle}</p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Conversation History Sidebar */}
        <SurfaceCard className="p-4 lg:col-span-3">
          <p className="mb-3 font-display text-xs font-semibold uppercase tracking-wide text-[#D4AF70]">
            Conversation History
          </p>
          {sessions.length === 0 ? (
            <p className="text-xs leading-relaxed text-[#7D7973]">
              Your saved mentor consultations will appear here after your first message.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {sessions.map((sess) => {
                const active = sess.id === activeSessionId;
                return (
                  <li key={sess.id} className="flex items-stretch gap-1">
                    <button
                      type="button"
                      onClick={() => handleLoadSession(sess)}
                      className={`min-w-0 flex-1 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                        active
                          ? 'border-[rgba(212,175,112,0.35)] bg-[#20212B] text-[#F7F3EA]'
                          : 'border-transparent bg-[#11121A] text-[#AAA6A0] hover:border-[rgba(212,175,112,0.16)] hover:text-[#F7F3EA]'
                      }`}
                    >
                      <p className="truncate text-xs font-medium">{sess.title}</p>
                      <p className="mt-0.5 text-[11px] text-[#7D7973]">
                        {sess.messages.length} turns · {sess.updatedAtLabel}
                      </p>
                    </button>
                    {onDeleteSession && (
                      <button
                        type="button"
                        aria-label={`Delete consultation ${sess.title}`}
                        onClick={() => {
                          void onDeleteSession(sess.id)
                            .then(() => {
                              if (activeSessionId === sess.id) {
                                handleNewSession();
                              }
                            })
                            .catch((err) => {
                              setErrorMsg(formatFirestoreUserMessage(err));
                            });
                        }}
                        className="flex items-center justify-center rounded-lg border border-transparent bg-[#11121A] px-2 text-[#7D7973] hover:border-[rgba(212,175,112,0.16)] hover:text-[#F29C9F] transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </SurfaceCard>

        {/* Main Chat Surface */}
        <SurfaceCard className="flex min-h-[540px] flex-col justify-between overflow-hidden lg:col-span-9">
          <div
            ref={scrollRef}
            className="flex-1 space-y-5 overflow-y-auto p-6"
            style={{ maxHeight: '520px' }}
          >
            {messages.length === 0 ? (
              <div className="flex h-full flex-col justify-center space-y-6 py-8">
                <div className="space-y-2">
                  <Bot className="h-6 w-6 text-[#D4AF70]" />
                  <h3 className="font-display text-lg font-semibold text-[#F7F3EA]">
                    Ask SkillPath AI Mentor
                  </h3>
                  <p className="max-w-xl text-sm text-[#AAA6A0]">
                    Every query is routed through our coordinated server-side Gemini 4 multi-agent architecture with access to your {career.title} progress ({readiness}% readiness).
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-[#D4AF70]">Suggested Prompts</p>
                  <div className="grid grid-cols-1 gap-2">
                    {STARTER_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => void sendPrompt(prompt)}
                        className="rounded-lg border border-[rgba(212,175,112,0.16)] bg-[#11121A] px-4 py-3 text-left text-xs text-[#F7F3EA] hover:border-[#D4AF70] transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-2xl rounded-xl border px-4 py-3.5 ${
                      msg.sender === 'user'
                        ? 'border-[rgba(212,175,112,0.34)] bg-[#20212B] text-[#F7F3EA]'
                        : 'border-[rgba(212,175,112,0.16)] bg-[#11121A] text-[#F7F3EA]'
                    }`}
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-4 text-[11px] text-[#7D7973]">
                      <span className="font-medium text-[#D4AF70]">
                        {msg.sender === 'user'
                          ? profile.displayName
                          : msg.agentLabel || 'AI Mentor'}
                      </span>
                      <span className="font-mono-tabular">{msg.timestamp}</span>
                    </div>

                    {msg.coordinationSummary && (
                      <p className="mb-2 border-b border-[rgba(212,175,112,0.12)] pb-2 text-xs italic text-[#AAA6A0]">
                        {msg.coordinationSummary}
                      </p>
                    )}

                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-[#F7F3EA]">
                      {msg.content}
                    </div>

                    {msg.actionableSteps && msg.actionableSteps.length > 0 && (
                      <div className="mt-3 border-t border-[rgba(212,175,112,0.12)] pt-3">
                        <p className="mb-1.5 text-xs font-medium text-[#F5D78E]">
                          Recommended Next Steps
                        </p>
                        <ul className="space-y-1 text-xs text-[#AAA6A0]">
                          {msg.actionableSteps.map((step, i) => (
                            <li key={i}>
                              <span className="font-mono-tabular text-[#D4AF70]">0{i + 1}.</span>{' '}
                              {step}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {msg.followUpQuestions && msg.followUpQuestions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-[rgba(212,175,112,0.12)] pt-3">
                        {msg.followUpQuestions.map((q, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => void sendPrompt(q)}
                            className="rounded-md border border-[rgba(212,175,112,0.2)] bg-[#171821] px-2.5 py-1.5 text-left text-[11px] text-[#F5D78E] hover:border-[#D4AF70]"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {sending && (
              <div className="flex items-center gap-3 rounded-lg border border-[rgba(212,175,112,0.14)] bg-[#11121A] px-4 py-3 text-xs text-[#AAA6A0]">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#D4AF70] border-t-transparent" />
                <span>Coordinating specialist response via Gemini 4...</span>
              </div>
            )}
          </div>

          <div className="border-t border-[rgba(212,175,112,0.14)] bg-[#11121A] p-4 space-y-3">
            {errorMsg && (
              <div className="space-y-2">
                <ToastBanner
                  tone="error"
                  message={errorMsg}
                  onDismiss={() => setErrorMsg(null)}
                />
                {lastFailedPrompt && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void sendPrompt(lastFailedPrompt)}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retry Last Prompt
                  </Button>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex items-end gap-3">
              <div className="flex-1">
                <label htmlFor="mentor-prompt-input" className="sr-only">
                  Ask SkillPath AI Mentor
                </label>
                <textarea
                  id="mentor-prompt-input"
                  rows={2}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void sendPrompt(input);
                    }
                  }}
                  placeholder="Ask about algorithms, systems design, study pacing, or career positioning..."
                  className="w-full resize-none rounded-lg border border-[rgba(212,175,112,0.2)] bg-[#090A0F] px-3.5 py-2.5 text-sm text-[#F7F3EA] placeholder:text-[#6F6B66] focus:border-[#D4AF70] focus:outline-none"
                />
              </div>
              <Button type="submit" size="md" loading={sending} disabled={input.trim().length < 2}>
                <Send className="h-4 w-4" />
                Send
              </Button>
            </form>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
