import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

export type AgentRole =
  | 'orchestrator'
  | 'career_strategist'
  | 'curriculum_architect'
  | 'technical_tutor'
  | 'assessment_coach';

export interface StudentContextPayload {
  displayName?: string;
  academicTrack?: string;
  institution?: string;
  graduationYear?: number;
  selectedCareerTitle?: string;
  readinessScore?: number;
  roadmapPercent?: number;
  weeklyStudyHours?: number;
  skillScores?: Record<string, number>;
  completedMilestones?: string[];
  careerInterests?: string[];
  academicContext?: {
    subjectName?: string;
    subjectCategory?: string;
    chapterTitle?: string;
    topic?: string;
    weakTopics?: string[];
    sourceExcerpt?: string;
  };
}

export interface MentorRequestPayload {
  message: string;
  agentRole: AgentRole;
  history?: { sender: 'user' | 'agent'; content: string }[];
  studentContext?: StudentContextPayload;
}

export interface MentorStructuredResponse {
  agentUsed: Exclude<AgentRole, 'orchestrator'>;
  agentLabel: string;
  coordinationSummary: string;
  reply: string;
  actionableSteps: string[];
  followUpQuestions: string[];
}

export interface SkillInsightResponse {
  headline: string;
  priorityGap: string;
  diagnosticSummary: string;
  recommendedDrills: string[];
}

export interface AdaptiveMilestoneSuggestion {
  title: string;
  durationWeeks: number;
  focusArea: string;
  deliverable: string;
}

export interface AdaptiveRoadmapResponse {
  pathwaySummary: string;
  weeklyCadenceNote: string;
  milestones: AdaptiveMilestoneSuggestion[];
}

export class GeminiServiceError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 500, code = 'GEMINI_ERROR') {
    super(message);
    this.name = 'GeminiServiceError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const AGENT_METADATA: Record<
  Exclude<AgentRole, 'orchestrator'>,
  { label: string; mandate: string }
> = {
  career_strategist: {
    label: 'Career Strategist',
    mandate:
      'Align academic projects, skill deficits, and portfolio artifacts with high-signal target career benchmarks.',
  },
  curriculum_architect: {
    label: 'Curriculum Architect',
    mandate:
      'Sequence multi-stage learning roadmaps, weekly study cadences, and milestone deliverables without overloading the student.',
  },
  technical_tutor: {
    label: 'Technical Tutor',
    mandate:
      'Deliver rigorous, lucid explanations across algorithms, systems architecture, machine learning, mathematics, and software design.',
  },
  assessment_coach: {
    label: 'Assessment Coach',
    mandate:
      'Diagnose conceptual gaps, propose targeted empirical drills, and benchmark readiness honestly without inflated scores.',
  },
};

export function selectSpecialistAgent(
  requestedRole: AgentRole,
  message: string
): Exclude<AgentRole, 'orchestrator'> {
  if (requestedRole !== 'orchestrator') {
    return requestedRole;
  }

  const normalized = message.toLowerCase();
  if (
    /\b(career|job|role|interview|salary|portfolio|market|intern|resume|industry|hire)\b/.test(
      normalized
    )
  ) {
    return 'career_strategist';
  }
  if (
    /\b(roadmap|schedule|week|milestone|stage|curriculum|plan|course|study|cadence|syllabus)\b/.test(
      normalized
    )
  ) {
    return 'curriculum_architect';
  }
  if (
    /\b(test|quiz|assess|score|evaluate|weakness|gap|benchmark|diagnostic|practice|drill)\b/.test(
      normalized
    )
  ) {
    return 'assessment_coach';
  }
  return 'technical_tutor';
}

export function validateMentorInput(body: unknown): MentorRequestPayload {
  if (!body || typeof body !== 'object') {
    throw new GeminiServiceError('Request body must be a JSON object.', 400, 'INVALID_REQUEST');
  }
  const candidate = body as Record<string, unknown>;
  const rawMessage = typeof candidate.message === 'string' ? candidate.message.trim() : '';
  if (rawMessage.length < 2 || rawMessage.length > 2500) {
    throw new GeminiServiceError(
      'Message must be between 2 and 2500 characters.',
      400,
      'INVALID_MESSAGE'
    );
  }

  const allowedRoles: AgentRole[] = [
    'orchestrator',
    'career_strategist',
    'curriculum_architect',
    'technical_tutor',
    'assessment_coach',
  ];
  const rawRole = candidate.agentRole;
  const agentRole: AgentRole =
    typeof rawRole === 'string' && allowedRoles.includes(rawRole as AgentRole)
      ? (rawRole as AgentRole)
      : 'orchestrator';

  const rawHistory = Array.isArray(candidate.history) ? candidate.history : [];
  const history = rawHistory
    .slice(-12)
    .filter(
      (item): item is { sender: 'user' | 'agent'; content: string } =>
        Boolean(item) &&
        typeof item === 'object' &&
        ((item as { sender?: unknown }).sender === 'user' ||
          (item as { sender?: unknown }).sender === 'agent') &&
        typeof (item as { content?: unknown }).content === 'string'
    )
    .map((item) => ({
      sender: item.sender,
      content: item.content.trim().slice(0, 1500),
    }));

  const studentContext =
    candidate.studentContext && typeof candidate.studentContext === 'object'
      ? (candidate.studentContext as StudentContextPayload)
      : undefined;

  return {
    message: rawMessage,
    agentRole,
    history,
    studentContext,
  };
}

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new GeminiServiceError(
      'GEMINI_API_KEY is not configured on the server. Add your Gemini API key in Settings > Secrets to enable live AI mentorship.',
      503,
      'MISSING_API_KEY'
    );
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withTimeoutAndRetry<T>(
  operation: () => Promise<T>,
  timeoutMs = 60000,
  maxRetries = 2
): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timer = setTimeout(() => {
          reject(
            new GeminiServiceError(
              'The AI service timed out before completing a response. Please retry.',
              504,
              'TIMEOUT'
            )
          );
        }, timeoutMs);
        // Prevent timer from blocking Node exit
        if (typeof timer.unref === 'function') timer.unref();
      });

      return await Promise.race([operation(), timeoutPromise]);
    } catch (error) {
      const mapped = mapGeminiError(error);
      console.error(`[Gemini] Attempt ${attempt + 1} failed (${mapped.code}): ${mapped.message}`);
      const retryable = mapped.statusCode === 429 || mapped.statusCode === 503;
      if (retryable && attempt < maxRetries) {
        const delayMs = 600 * Math.pow(2, attempt);
        attempt += 1;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      throw mapped;
    }
  }
}

export function mapGeminiError(error: unknown): GeminiServiceError {
  if (error instanceof GeminiServiceError) return error;

  const rawMessage = error instanceof Error ? error.message : String(error);
  const lower = rawMessage.toLowerCase();

  if (lower.includes('api_key_invalid') || lower.includes('api key not valid') || lower.includes('403') || lower.includes('permission_denied')) {
    return new GeminiServiceError(
      'The configured GEMINI_API_KEY was rejected by Google Gemini. Verify the key in Settings > Secrets.',
      403,
      'INVALID_API_KEY'
    );
  }
  if (lower.includes('resource_exhausted') || lower.includes('429') || lower.includes('quota')) {
    return new GeminiServiceError(
      'Gemini API rate limit or quota reached. Please wait a moment and try again.',
      429,
      'RATE_LIMITED'
    );
  }
  if (lower.includes('not_found') || lower.includes('404')) {
    return new GeminiServiceError(
      'Requested Gemini model endpoint was not found. Verify model configuration.',
      502,
      'MODEL_NOT_FOUND'
    );
  }

  return new GeminiServiceError(
    'Unable to complete the Gemini request right now. Please try again shortly.',
    502,
    'MODEL_ERROR'
  );
}

function formatStudentContextBlock(ctx?: StudentContextPayload): string {
  if (!ctx) return 'No student profile context supplied.';
  const lines = [
    `Student: ${ctx.displayName ?? 'Scholar'}`,
    `Academic Track: ${ctx.academicTrack ?? 'Unspecified'} (${ctx.institution ?? 'University'}, Class of ${ctx.graduationYear ?? 'TBD'})`,
    `Target Career Pathway: ${ctx.selectedCareerTitle ?? 'General Technology'}`,
    `Career Readiness Score: ${ctx.readinessScore ?? 'N/A'}% | Roadmap Completion: ${ctx.roadmapPercent ?? 'N/A'}% | Weekly Study Budget: ${ctx.weeklyStudyHours ?? 10}h`,
    `Interests: ${(ctx.careerInterests ?? []).join(', ') || 'Unspecified'}`,
    `Skill Scores (0-100): ${ctx.skillScores ? JSON.stringify(ctx.skillScores) : 'Unavailable'}`,
    `Completed Milestones: ${(ctx.completedMilestones ?? []).join(', ') || 'None yet'}`,
  ];
  if (ctx.academicContext) {
    const ac = ctx.academicContext;
    lines.push(
      `Active Academic Subject: ${ac.subjectName ?? 'Unspecified'} (${ac.subjectCategory ?? 'General'})`,
      `Active Chapter / Topic: ${ac.chapterTitle ?? 'General'} — ${ac.topic ?? 'Core concepts'}`,
      `Identified Weak Topics: ${(ac.weakTopics ?? []).join(', ') || 'None flagged'}`
    );
    if (ac.sourceExcerpt) {
      lines.push(`Student Study Excerpt: ${ac.sourceExcerpt.slice(0, 2000)}`);
    }
  }
  return lines.join('\n');
}

export async function generateMentorResponse(
  payload: MentorRequestPayload
): Promise<MentorStructuredResponse> {
  const ai = getClient();
  const specialist = selectSpecialistAgent(payload.agentRole, payload.message);
  const meta = AGENT_METADATA[specialist];

  const systemInstruction = [
    `You are the ${meta.label} inside SkillPath AI's coordinated multi-agent academic intelligence system.`,
    `Your Mandate: ${meta.mandate}`,
    'Multi-Agent Coordination Contract:',
    '- Respect the student\'s active target career pathway, current skill scores, and weekly study hour budget so recommendations never conflict with their Curriculum Architect or Career Strategist plan.',
    '- Be intellectually rigorous, concise, structured, and honest about uncertainty. Never invent statistics, credentials, or guaranteed job offers.',
    '- Write clear, well-structured prose in `reply` (using crisp paragraphs or bullet points) and provide concrete `actionableSteps` and `followUpQuestions`.',
  ].join('\n');

  const historyText =
    payload.history && payload.history.length > 0
      ? payload.history
          .map((turn) => `${turn.sender === 'user' ? 'Student' : 'Mentor'}: ${turn.content}`)
          .join('\n')
      : 'None (start of session)';

  const prompt = [
    '=== STUDENT PROFILE CONTEXT ===',
    formatStudentContextBlock(payload.studentContext),
    '',
    '=== RECENT CONVERSATION ===',
    historyText,
    '',
    '=== CURRENT QUESTION ===',
    payload.message,
  ].join('\n');

  const response = await withTimeoutAndRetry(async () => {
    return ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            coordinationSummary: {
              type: Type.STRING,
              description:
                'One-sentence summary of how this specialist aligned with the student\'s active pathway and study budget.',
            },
            reply: {
              type: Type.STRING,
              description: 'Main mentoring response addressing the student\'s question directly.',
            },
            actionableSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2 to 4 concrete next steps tailored to the student.',
            },
            followUpQuestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2 concise follow-up questions the student can ask next.',
            },
          },
          required: ['coordinationSummary', 'reply', 'actionableSteps', 'followUpQuestions'],
        },
      },
    });
  });

  const rawText = (response.text ?? '').trim();
  if (!rawText) {
    throw new GeminiServiceError('Gemini returned an empty response.', 502, 'EMPTY_RESPONSE');
  }

  let parsed: {
    coordinationSummary?: string;
    reply?: string;
    actionableSteps?: string[];
    followUpQuestions?: string[];
  };
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return {
      agentUsed: specialist,
      agentLabel: meta.label,
      coordinationSummary: `Aligned with ${payload.studentContext?.selectedCareerTitle ?? 'active pathway'}.`,
      reply: rawText,
      actionableSteps: [],
      followUpQuestions: [],
    };
  }

  return {
    agentUsed: specialist,
    agentLabel: meta.label,
    coordinationSummary:
      parsed.coordinationSummary ||
      `Coordinated across ${meta.label} and active pathway telemetry.`,
    reply: parsed.reply || 'Unable to parse structured answer.',
    actionableSteps: Array.isArray(parsed.actionableSteps)
      ? parsed.actionableSteps.slice(0, 4)
      : [],
    followUpQuestions: Array.isArray(parsed.followUpQuestions)
      ? parsed.followUpQuestions.slice(0, 3)
      : [],
  };
}

export async function generateSkillInsight(
  studentContext: StudentContextPayload
): Promise<SkillInsightResponse> {
  const ai = getClient();

  const prompt = [
    'Analyze this student\'s current skill scores against their target career pathway.',
    formatStudentContextBlock(studentContext),
    'Return a concise empirical diagnostic identifying the highest-leverage skill gap and 3 focused practice drills.',
  ].join('\n\n');

  const response = await withTimeoutAndRetry(async () => {
    return ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction:
          'You are the SkillPath AI Assessment Coach. Be concrete, realistic, and never fabricate scores not present in the context.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING },
            priorityGap: { type: Type.STRING },
            diagnosticSummary: { type: Type.STRING },
            recommendedDrills: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['headline', 'priorityGap', 'diagnosticSummary', 'recommendedDrills'],
        },
      },
    });
  });

  const parsed = JSON.parse((response.text ?? '{}').trim()) as Partial<SkillInsightResponse>;
  return {
    headline: parsed.headline || 'Skill Diagnostic Summary',
    priorityGap: parsed.priorityGap || 'Balanced progression across pillars',
    diagnosticSummary: parsed.diagnosticSummary || 'Continue closing gaps on core engineering competencies.',
    recommendedDrills: Array.isArray(parsed.recommendedDrills)
      ? parsed.recommendedDrills.slice(0, 3)
      : [],
  };
}

export async function generateAdaptiveRoadmap(
  studentContext: StudentContextPayload
): Promise<AdaptiveRoadmapResponse> {
  const ai = getClient();

  const prompt = [
    'Generate 3 personalized supplementary milestones tailored to this student\'s remaining skill gaps and weekly study hours.',
    formatStudentContextBlock(studentContext),
  ].join('\n\n');

  const response = await withTimeoutAndRetry(async () => {
    return ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction:
          'You are the SkillPath AI Curriculum Architect. Ensure milestone workloads respect the student\'s weekly study hours and build directly toward their target career pathway.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pathwaySummary: { type: Type.STRING },
            weeklyCadenceNote: { type: Type.STRING },
            milestones: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  durationWeeks: { type: Type.INTEGER },
                  focusArea: { type: Type.STRING },
                  deliverable: { type: Type.STRING },
                },
                required: ['title', 'durationWeeks', 'focusArea', 'deliverable'],
              },
            },
          },
          required: ['pathwaySummary', 'weeklyCadenceNote', 'milestones'],
        },
      },
    });
  });

  const parsed = JSON.parse((response.text ?? '{}').trim()) as Partial<AdaptiveRoadmapResponse>;
  return {
    pathwaySummary: parsed.pathwaySummary || 'Adaptive supplementary progression',
    weeklyCadenceNote:
      parsed.weeklyCadenceNote ||
      `Calibrated for ${studentContext.weeklyStudyHours ?? 12} hours/week.`,
    milestones: Array.isArray(parsed.milestones) ? parsed.milestones.slice(0, 4) : [],
  };
}

export interface StudyMaterialRequestPayload {
  subjectName: string;
  subjectCategory: string;
  chapterTitle?: string;
  topic: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Exam Preparation';
  format: string;
  sourceMaterialExcerpt?: string;
}

export interface GeneratedStudyMaterialResponse {
  title: string;
  content: string;
  keyDefinitions: string[];
  formulasOrRules: string[];
  realWorldExamples: string[];
  practicePrompts: string[];
  aiDisclaimer: string;
}

export async function generateStudyMaterial(
  payload: StudyMaterialRequestPayload
): Promise<GeneratedStudyMaterialResponse> {
  const ai = getClient();
  const subjectName = payload.subjectName.trim().slice(0, 140);
  const topic = payload.topic.trim().slice(0, 140);
  if (!subjectName || topic.length < 2) {
    throw new GeminiServiceError(
      'Subject name and topic (at least 2 characters) are required.',
      400,
      'INVALID_REQUEST'
    );
  }

  const prompt = [
    `Subject: ${subjectName} (${payload.subjectCategory})`,
    `Chapter: ${payload.chapterTitle || 'General Subject Scope'}`,
    `Topic: ${topic}`,
    `Explanation Level: ${payload.level}`,
    `Requested Learning Format: ${payload.format}`,
    payload.sourceMaterialExcerpt
      ? `Student Source Material Excerpt:\n${payload.sourceMaterialExcerpt.slice(0, 3500)}`
      : 'No uploaded excerpt supplied; teach from established foundational principles of this topic.',
  ].join('\n\n');

  const response = await withTimeoutAndRetry(async () => {
    return ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction: [
          'You are an academic study architect for SkillPath AI.',
          'Generate accurate, crystal-clear educational material tailored strictly to the requested format and explanation level.',
          'STRICT INTEGRITY RULES:',
          '- Never invent textbook edition numbers, page numbers, ISBNs, or unverified official exam predictions.',
          '- When source material is supplied, ground explanations faithfully in it without fabricating claims.',
          '- Adapt depth cleanly to Beginner (intuitive analogies & foundational steps), Intermediate (structured mechanisms & worked reasoning), Advanced (rigorous proofs/edge cases), or Exam Preparation (high-yield revision & common traps).',
        ].join('\n'),
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: {
              type: Type.STRING,
              description:
                'Comprehensive formatted study content matching the requested learning format.',
            },
            keyDefinitions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            formulasOrRules: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            realWorldExamples: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            practicePrompts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: [
            'title',
            'content',
            'keyDefinitions',
            'formulasOrRules',
            'realWorldExamples',
            'practicePrompts',
          ],
        },
      },
    });
  });

  const parsed = JSON.parse((response.text ?? '{}').trim()) as Partial<GeneratedStudyMaterialResponse>;
  return {
    title: parsed.title || `${payload.format}: ${topic}`,
    content: parsed.content || 'Unable to generate study content.',
    keyDefinitions: Array.isArray(parsed.keyDefinitions) ? parsed.keyDefinitions.slice(0, 8) : [],
    formulasOrRules: Array.isArray(parsed.formulasOrRules) ? parsed.formulasOrRules.slice(0, 8) : [],
    realWorldExamples: Array.isArray(parsed.realWorldExamples)
      ? parsed.realWorldExamples.slice(0, 5)
      : [],
    practicePrompts: Array.isArray(parsed.practicePrompts) ? parsed.practicePrompts.slice(0, 5) : [],
    aiDisclaimer:
      'AI-generated study material powered by Gemini. Cross-check critical formulas and definitions against your primary course syllabus.',
  };
}

export interface AssessmentGenerationPayload {
  subjectName: string;
  subjectCategory: string;
  chapterTitle?: string;
  topics?: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Exam';
  questionCount: number;
  questionTypes: Array<
    'mcq' | 'multiple_select' | 'short_answer' | 'long_answer' | 'numerical' | 'conceptual'
  >;
  sourceMaterialExcerpt?: string;
}

export interface GeneratedAcademicQuestion {
  id: string;
  type: 'mcq' | 'multiple_select' | 'short_answer' | 'long_answer' | 'numerical' | 'conceptual';
  topic: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Exam';
  prompt: string;
  options?: string[];
  correctOptionIndex?: number;
  correctOptionIndices?: number[];
  correctNumericalAnswer?: number;
  numericalTolerance?: number;
  referenceAnswer?: string;
  keyPoints?: string[];
  explanation: string;
  aiGenerated: boolean;
}

export async function generateAcademicAssessment(
  payload: AssessmentGenerationPayload
): Promise<{ questions: GeneratedAcademicQuestion[]; aiNotice: string }> {
  const ai = getClient();
  const count = Math.max(2, Math.min(10, Math.round(payload.questionCount || 4)));
  const types = payload.questionTypes.length > 0 ? payload.questionTypes : ['mcq'];

  const prompt = [
    `Subject: ${payload.subjectName} (${payload.subjectCategory})`,
    `Chapter: ${payload.chapterTitle || 'General Subject Assessment'}`,
    `Topics: ${(payload.topics ?? []).join(', ') || 'Core chapter concepts'}`,
    `Difficulty: ${payload.difficulty}`,
    `Total Questions: ${count}`,
    `Allowed Question Types (cycle through these): ${types.join(', ')}`,
    payload.sourceMaterialExcerpt
      ? `Study Context Excerpt:\n${payload.sourceMaterialExcerpt.slice(0, 2500)}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const response = await withTimeoutAndRetry(async () => {
    return ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction: [
          'You are an academic assessment designer.',
          'Generate clear, rigorous, unambiguously solvable questions matching the requested subject, chapter, difficulty, and types.',
          '- For `mcq`: include 4 `options` and valid 0-based `correctOptionIndex`.',
          '- For `multiple_select`: include 4 `options` and 2+ valid 0-based `correctOptionIndices`.',
          '- For `numerical`: include `correctNumericalAnswer` (number) and `numericalTolerance` (e.g., 0.05).',
          '- For `short_answer`, `long_answer`, and `conceptual`: include `referenceAnswer` and 2-4 `keyPoints`.',
          '- Always provide a concise, accurate `explanation` and `topic`.',
        ].join('\n'),
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  topic: { type: Type.STRING },
                  prompt: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctOptionIndex: { type: Type.INTEGER },
                  correctOptionIndices: { type: Type.ARRAY, items: { type: Type.INTEGER } },
                  correctNumericalAnswer: { type: Type.NUMBER },
                  numericalTolerance: { type: Type.NUMBER },
                  referenceAnswer: { type: Type.STRING },
                  keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                  explanation: { type: Type.STRING },
                },
                required: ['type', 'topic', 'prompt', 'explanation'],
              },
            },
          },
          required: ['questions'],
        },
      },
    });
  });

  const parsed = JSON.parse((response.text ?? '{}').trim()) as {
    questions?: Array<Partial<GeneratedAcademicQuestion>>;
  };
  const validTypes = new Set([
    'mcq',
    'multiple_select',
    'short_answer',
    'long_answer',
    'numerical',
    'conceptual',
  ]);

  const normalized: GeneratedAcademicQuestion[] = (parsed.questions ?? [])
    .slice(0, count)
    .map((q, idx) => {
      const qType =
        typeof q.type === 'string' && validTypes.has(q.type)
          ? (q.type as GeneratedAcademicQuestion['type'])
          : 'mcq';

      const options = Array.isArray(q.options) && q.options.length >= 2 ? q.options.slice(0, 5) : undefined;
      const safeOptionCount = options?.length ?? 4;

      return {
        id: `ai-q-${Date.now()}-${idx}`,
        type: qType,
        topic: (q.topic || payload.chapterTitle || payload.subjectName).slice(0, 120),
        difficulty: payload.difficulty,
        prompt: q.prompt || `Question ${idx + 1}`,
        options:
          qType === 'mcq' || qType === 'multiple_select'
            ? options ?? ['Option A', 'Option B', 'Option C', 'Option D']
            : undefined,
        correctOptionIndex:
          qType === 'mcq'
            ? Math.max(0, Math.min(safeOptionCount - 1, Number(q.correctOptionIndex) || 0))
            : undefined,
        correctOptionIndices:
          qType === 'multiple_select'
            ? Array.isArray(q.correctOptionIndices) && q.correctOptionIndices.length > 0
              ? q.correctOptionIndices.filter((i) => i >= 0 && i < safeOptionCount)
              : [0, 1]
            : undefined,
        correctNumericalAnswer:
          qType === 'numerical' ? Number(q.correctNumericalAnswer ?? 0) : undefined,
        numericalTolerance:
          qType === 'numerical' ? Math.max(0.001, Number(q.numericalTolerance ?? 0.05)) : undefined,
        referenceAnswer: q.referenceAnswer,
        keyPoints: Array.isArray(q.keyPoints) ? q.keyPoints.slice(0, 5) : undefined,
        explanation: q.explanation || 'Review the core concept definition and boundary assumptions.',
        aiGenerated: true,
      };
    });

  if (normalized.length === 0) {
    throw new GeminiServiceError('Gemini returned no assessment questions.', 502, 'EMPTY_RESPONSE');
  }

  return {
    questions: normalized,
    aiNotice:
      'Questions generated by AI for practice based on your selected subject and chapter. Verify against your syllabus.',
  };
}

export interface SubjectiveEvaluationItemInput {
  questionId: string;
  prompt: string;
  referenceAnswer?: string;
  keyPoints?: string[];
  studentAnswer: string;
}

export interface SubjectiveEvaluationItemResult {
  questionId: string;
  scoreRatio: number;
  feedback: string;
  needsHumanReview: boolean;
}

export async function evaluateSubjectiveAnswers(payload: {
  subjectName: string;
  items: SubjectiveEvaluationItemInput[];
}): Promise<{ evaluations: SubjectiveEvaluationItemResult[]; disclaimer: string }> {
  const ai = getClient();
  const items = payload.items.slice(0, 15);
  if (items.length === 0) {
    return {
      evaluations: [],
      disclaimer: 'No subjective responses supplied.',
    };
  }

  const prompt = [
    `Subject: ${payload.subjectName}`,
    'Evaluate each student written response fairly against the reference points on a 0.0 to 1.0 scale.',
    JSON.stringify(items),
  ].join('\n\n');

  const response = await withTimeoutAndRetry(async () => {
    return ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction:
          'You are an academic rubric coach. Score honestly from 0.0 to 1.0, highlight missing reasoning or assumptions concisely, and never inflate empty or vague answers.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            evaluations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  questionId: { type: Type.STRING },
                  scoreRatio: { type: Type.NUMBER },
                  feedback: { type: Type.STRING },
                },
                required: ['questionId', 'scoreRatio', 'feedback'],
              },
            },
          },
          required: ['evaluations'],
        },
      },
    });
  });

  const parsed = JSON.parse((response.text ?? '{}').trim()) as {
    evaluations?: Array<{ questionId?: string; scoreRatio?: number; feedback?: string }>;
  };

  const evaluations: SubjectiveEvaluationItemResult[] = items.map((item) => {
    const match = (parsed.evaluations ?? []).find((e) => e.questionId === item.questionId);
    const ratio =
      typeof match?.scoreRatio === 'number' && Number.isFinite(match.scoreRatio)
        ? Math.max(0, Math.min(1, Number(match.scoreRatio.toFixed(2))))
        : 0;
    return {
      questionId: item.questionId,
      scoreRatio: ratio,
      feedback:
        match?.feedback ||
        'AI-assisted provisional review completed. Confirm full reasoning with an instructor.',
      needsHumanReview: true,
    };
  });

  return {
    evaluations,
    disclaimer:
      'AI-assisted evaluation provides provisional feedback on written explanations and should be confirmed by instructor/human review for formal grading.',
  };
}

