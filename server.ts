import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  GeminiServiceError,
  evaluateSubjectiveAnswers,
  generateAcademicAssessment,
  generateAdaptiveRoadmap,
  generateMentorResponse,
  generateSkillInsight,
  generateStudyMaterial,
  validateMentorInput,
  type StudentContextPayload,
} from './server/gemini.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BOOTSTRAPPED_ADMIN_EMAILS = new Set(['vidhyashalini5@gmail.com']);

interface FirebaseConfigFile {
  projectId: string;
  apiKey: string;
}

function loadFirebaseConfig(): FirebaseConfigFile | null {
  try {
    const raw = fs.readFileSync(path.join(__dirname, 'firebase-applet-config.json'), 'utf8');
    return JSON.parse(raw) as FirebaseConfigFile;
  } catch {
    return null;
  }
}

const firebaseConfig = loadFirebaseConfig();

// Sliding-window rate limiter (per client IP or user token prefix)
const rateBuckets = new Map<string, number[]>();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 25;

function aiRateLimiter(req: Request, res: Response, next: NextFunction) {
  const clientKey = req.ip || 'unknown';
  const now = Date.now();
  const timestamps = (rateBuckets.get(clientKey) ?? []).filter((t) => now - t < RATE_WINDOW_MS);

  if (timestamps.length >= RATE_MAX_REQUESTS) {
    res.status(429).json({
      error: 'Too many AI requests in the last minute. Please wait briefly before sending another request.',
      code: 'RATE_LIMITED',
    });
    return;
  }

  timestamps.push(now);
  rateBuckets.set(clientKey, timestamps);
  next();
}

interface VerifiedFirebaseUser {
  uid: string;
  email: string;
  emailVerified: boolean;
}

async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseUser | null> {
  if (!firebaseConfig?.apiKey || !idToken) return null;

  try {
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!resp.ok) return null;
    const data = (await resp.json()) as {
      users?: Array<{ localId?: string; email?: string; emailVerified?: boolean }>;
    };
    const user = data.users?.[0];
    if (!user?.localId || !user?.email) return null;
    return {
      uid: user.localId,
      email: user.email,
      emailVerified: Boolean(user.emailVerified),
    };
  } catch {
    return null;
  }
}

async function resolveAuthHeader(req: Request): Promise<VerifiedFirebaseUser | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;
  return verifyFirebaseIdToken(token);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Structured request logging (redacting auth tokens and secrets)
  app.use('/api', (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const durationMs = Date.now() - start;
      console.log(`[API] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs}ms)`);
    });
    next();
  });

  app.get('/api/health', (_req, res) => {
    const key = process.env.GEMINI_API_KEY?.trim();
    const geminiConfigured = Boolean(key && key !== 'MY_GEMINI_API_KEY');
    res.json({
      ok: true,
      geminiConfigured,
      model: 'gemini-4-hydrogen',
      firebaseProjectId: firebaseConfig?.projectId ?? null,
    });
  });

  app.post('/api/auth/verify-admin', async (req, res) => {
    try {
      const user = await resolveAuthHeader(req);
      if (!user) {
        res.status(401).json({ authorized: false, error: 'Valid Firebase session required.' });
        return;
      }
      if (!user.emailVerified) {
        res.status(403).json({ authorized: false, error: 'Verified email required for admin access.' });
        return;
      }

      const isAuthorized = BOOTSTRAPPED_ADMIN_EMAILS.has(user.email.toLowerCase());
      res.json({
        authorized: isAuthorized,
        uid: user.uid,
        role: isAuthorized ? 'admin' : 'student',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to verify admin session.';
      res.status(500).json({ authorized: false, error: message, code: 'INTERNAL_ERROR' });
    }
  });

  app.post('/api/chat', aiRateLimiter, async (req, res) => {
    try {
      const isLiveMode = req.body?.mode === 'live';
      const hasAuthHeader = Boolean(req.headers.authorization);
      if (isLiveMode || hasAuthHeader) {
        const user = await resolveAuthHeader(req);
        if (!user) {
          res.status(401).json({
            error: 'Authentication required for live AI chat requests.',
            code: 'UNAUTHORIZED',
          });
          return;
        }
      }

      const validated = validateMentorInput(req.body);
      const result = await generateMentorResponse(validated);
      res.json(result);
    } catch (error) {
      if (error instanceof GeminiServiceError) {
        res.status(error.statusCode).json({ error: error.message, code: error.code });
        return;
      }
      const message = error instanceof Error ? error.message : 'Unexpected chat error.';
      res.status(500).json({ error: message, code: 'INTERNAL_ERROR' });
    }
  });

  app.post('/api/ai/mentor', aiRateLimiter, async (req, res) => {
    try {
      const isDemo = req.body?.mode === 'demo';
      if (!isDemo) {
        const user = await resolveAuthHeader(req);
        if (!user) {
          res.status(401).json({
            error: 'Authentication required for live AI Mentor requests.',
            code: 'UNAUTHORIZED',
          });
          return;
        }
      }

      const validated = validateMentorInput(req.body);
      const result = await generateMentorResponse(validated);
      res.json(result);
    } catch (error) {
      if (error instanceof GeminiServiceError) {
        res.status(error.statusCode).json({ error: error.message, code: error.code });
        return;
      }
      res.status(500).json({ error: 'Unexpected AI Mentor error.', code: 'INTERNAL_ERROR' });
    }
  });

  app.post('/api/ai/skill-insight', aiRateLimiter, async (req, res) => {
    try {
      const isDemo = req.body?.mode === 'demo';
      if (!isDemo) {
        const user = await resolveAuthHeader(req);
        if (!user) {
          res.status(401).json({ error: 'Authentication required.', code: 'UNAUTHORIZED' });
          return;
        }
      }

      const studentContext = (req.body?.studentContext ?? {}) as StudentContextPayload;
      const result = await generateSkillInsight(studentContext);
      res.json(result);
    } catch (error) {
      if (error instanceof GeminiServiceError) {
        res.status(error.statusCode).json({ error: error.message, code: error.code });
        return;
      }
      res.status(500).json({ error: 'Unexpected skill insight error.', code: 'INTERNAL_ERROR' });
    }
  });

  app.post('/api/ai/roadmap-generate', aiRateLimiter, async (req, res) => {
    try {
      const isDemo = req.body?.mode === 'demo';
      if (!isDemo) {
        const user = await resolveAuthHeader(req);
        if (!user) {
          res.status(401).json({ error: 'Authentication required.', code: 'UNAUTHORIZED' });
          return;
        }
      }

      const studentContext = (req.body?.studentContext ?? {}) as StudentContextPayload;
      const result = await generateAdaptiveRoadmap(studentContext);
      res.json(result);
    } catch (error) {
      if (error instanceof GeminiServiceError) {
        res.status(error.statusCode).json({ error: error.message, code: error.code });
        return;
      }
      const message = error instanceof Error ? error.message : 'Unexpected roadmap synthesis error.';
      res.status(500).json({ error: message, code: 'INTERNAL_ERROR' });
    }
  });

  app.post('/api/ai/study-material', aiRateLimiter, async (req, res) => {
    try {
      const isDemo = req.body?.mode === 'demo';
      if (!isDemo) {
        const user = await resolveAuthHeader(req);
        if (!user) {
          res.status(401).json({ error: 'Authentication required.', code: 'UNAUTHORIZED' });
          return;
        }
      }

      const result = await generateStudyMaterial({
        subjectName: String(req.body?.subjectName ?? ''),
        subjectCategory: String(req.body?.subjectCategory ?? 'General'),
        chapterTitle: typeof req.body?.chapterTitle === 'string' ? req.body.chapterTitle : undefined,
        topic: String(req.body?.topic ?? ''),
        level: req.body?.level || 'Intermediate',
        format: String(req.body?.format ?? 'Detailed Notes'),
        sourceMaterialExcerpt:
          typeof req.body?.sourceMaterialExcerpt === 'string'
            ? req.body.sourceMaterialExcerpt
            : undefined,
      });
      res.json(result);
    } catch (error) {
      if (error instanceof GeminiServiceError) {
        res.status(error.statusCode).json({ error: error.message, code: error.code });
        return;
      }
      const message = error instanceof Error ? error.message : 'Unable to generate study material.';
      res.status(500).json({ error: message, code: 'INTERNAL_ERROR' });
    }
  });

  app.post('/api/ai/assessment-generate', aiRateLimiter, async (req, res) => {
    try {
      const isDemo = req.body?.mode === 'demo';
      if (!isDemo) {
        const user = await resolveAuthHeader(req);
        if (!user) {
          res.status(401).json({ error: 'Authentication required.', code: 'UNAUTHORIZED' });
          return;
        }
      }

      const result = await generateAcademicAssessment({
        subjectName: String(req.body?.subjectName ?? ''),
        subjectCategory: String(req.body?.subjectCategory ?? 'General'),
        chapterTitle: typeof req.body?.chapterTitle === 'string' ? req.body.chapterTitle : undefined,
        topics: Array.isArray(req.body?.topics) ? req.body.topics.map(String) : undefined,
        difficulty: req.body?.difficulty || 'Intermediate',
        questionCount: Number(req.body?.questionCount) || 4,
        questionTypes: Array.isArray(req.body?.questionTypes) ? req.body.questionTypes : ['mcq'],
        sourceMaterialExcerpt:
          typeof req.body?.sourceMaterialExcerpt === 'string'
            ? req.body.sourceMaterialExcerpt
            : undefined,
      });
      res.json(result);
    } catch (error) {
      if (error instanceof GeminiServiceError) {
        res.status(error.statusCode).json({ error: error.message, code: error.code });
        return;
      }
      const message =
        error instanceof Error ? error.message : 'Unable to generate academic assessment.';
      res.status(500).json({ error: message, code: 'INTERNAL_ERROR' });
    }
  });

  app.post('/api/ai/assessment-evaluate', aiRateLimiter, async (req, res) => {
    try {
      const isDemo = req.body?.mode === 'demo';
      if (!isDemo) {
        const user = await resolveAuthHeader(req);
        if (!user) {
          res.status(401).json({ error: 'Authentication required.', code: 'UNAUTHORIZED' });
          return;
        }
      }

      const result = await evaluateSubjectiveAnswers({
        subjectName: String(req.body?.subjectName ?? 'Academic Subject'),
        items: Array.isArray(req.body?.items) ? req.body.items : [],
      });
      res.json(result);
    } catch (error) {
      if (error instanceof GeminiServiceError) {
        res.status(error.statusCode).json({ error: error.message, code: error.code });
        return;
      }
      const message =
        error instanceof Error ? error.message : 'Unable to evaluate subjective responses.';
      res.status(500).json({ error: message, code: 'INTERNAL_ERROR' });
    }
  });

  // Ensure unmatched /api/* routes ALWAYS return JSON rather than falling through to HTML.
  app.use('/api', (req, res) => {
    res.status(404).json({
      error: `API route not found: ${req.method} ${req.originalUrl}`,
      code: 'NOT_FOUND',
    });
  });

  // Ensure Express body-parser errors (e.g. invalid JSON) and uncaught /api errors ALWAYS return JSON.
  app.use('/api', (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (res.headersSent) return;
    const status =
      typeof err === 'object' &&
      err !== null &&
      'status' in err &&
      typeof (err as { status?: unknown }).status === 'number'
        ? (err as { status: number }).status
        : 500;
    const message =
      err instanceof SyntaxError
        ? 'Invalid JSON in request body.'
        : err instanceof Error
          ? err.message
          : 'Internal server error.';
    res.status(status).json({
      error: message,
      code: status === 400 ? 'BAD_JSON' : 'INTERNAL_ERROR',
    });
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`SkillPath AI server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start SkillPath AI server:', err);
  process.exit(1);
});
