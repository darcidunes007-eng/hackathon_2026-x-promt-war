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
  return [
    `Student: ${ctx.displayName ?? 'Scholar'}`,
    `Academic Track: ${ctx.academicTrack ?? 'Unspecified'} (${ctx.institution ?? 'University'}, Class of ${ctx.graduationYear ?? 'TBD'})`,
    `Target Career Pathway: ${ctx.selectedCareerTitle ?? 'General Technology'}`,
    `Career Readiness Score: ${ctx.readinessScore ?? 'N/A'}% | Roadmap Completion: ${ctx.roadmapPercent ?? 'N/A'}% | Weekly Study Budget: ${ctx.weeklyStudyHours ?? 10}h`,
    `Interests: ${(ctx.careerInterests ?? []).join(', ') || 'Unspecified'}`,
    `Skill Scores (0-100): ${ctx.skillScores ? JSON.stringify(ctx.skillScores) : 'Unavailable'}`,
    `Completed Milestones: ${(ctx.completedMilestones ?? []).join(', ') || 'None yet'}`,
  ].join('\n');
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
