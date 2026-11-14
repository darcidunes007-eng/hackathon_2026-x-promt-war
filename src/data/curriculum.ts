import type {
  CareerPathway,
  LearningGoal,
  SkillCategoryDefinition,
  SkillCategoryId,
  StudentProfile,
} from '../types/skillpath';

export const SKILL_CATEGORIES: SkillCategoryDefinition[] = [
  {
    id: 'systems_architecture',
    label: 'Systems Architecture',
    shortLabel: 'Systems',
    description: 'Distributed infrastructure, fault tolerance, concurrency, and cloud topology.',
  },
  {
    id: 'applied_ml',
    label: 'Applied Machine Learning',
    shortLabel: 'Applied ML',
    description: 'Model evaluation, fine-tuning, retrieval systems, and inference optimization.',
  },
  {
    id: 'algorithmic_reasoning',
    label: 'Algorithmic Reasoning',
    shortLabel: 'Algorithms',
    description: 'Data structures, complexity analysis, graph traversal, and optimization.',
  },
  {
    id: 'fullstack_engineering',
    label: 'Full-Stack Engineering',
    shortLabel: 'Full-Stack',
    description: 'Type-safe APIs, reactive interfaces, database modeling, and verification.',
  },
  {
    id: 'quantitative_literacy',
    label: 'Quantitative & Data Literacy',
    shortLabel: 'Quant & Data',
    description: 'Linear algebra, probability, experimental design, and statistical inference.',
  },
  {
    id: 'technical_communication',
    label: 'Technical Communication',
    shortLabel: 'Communication',
    description: 'Architecture RFCs, empirical synthesis, mentorship, and executive clarity.',
  },
];

export const DEFAULT_SKILL_SCORES: Record<SkillCategoryId, number> = {
  systems_architecture: 64,
  applied_ml: 58,
  algorithmic_reasoning: 72,
  fullstack_engineering: 76,
  quantitative_literacy: 68,
  technical_communication: 74,
};

export const CAREER_PATHWAYS: CareerPathway[] = [
  {
    id: 'ai-systems-architect',
    title: 'AI Systems Architect',
    domain: 'AI & ML',
    summary:
      'Design production multi-agent orchestration, low-latency inference pipelines, and grounded enterprise intelligence systems.',
    compensationRange: '$185k – $265k',
    demandOutlook: '+34% 5-Yr Growth',
    requiredSkills: {
      systems_architecture: 88,
      applied_ml: 86,
      algorithmic_reasoning: 80,
      fullstack_engineering: 78,
      quantitative_literacy: 76,
      technical_communication: 84,
    },
    coreCompetencies: [
      'Multi-agent orchestration & state graphs',
      'Context window & retrieval indexing',
      'Distributed telemetry & latency budgets',
      'Evaluation harnesses & safety guardrails',
    ],
    stages: [
      {
        stageNumber: 1,
        title: 'Foundational Architecture & Retrieval',
        objective: 'Establish deterministic API contracts, vector retrieval precision, and latency observability.',
        milestones: [
          {
            id: 'ai-arch-m1',
            title: 'Structured Schema Inference & Tool Routing',
            durationWeeks: 2,
            focusSkill: 'applied_ml',
            deliverable: 'Typed multi-tool router with schema verification tests.',
            resources: [
              { title: 'Designing Data-Intensive Applications (Ch. 1–4)', format: 'Book' },
              { title: 'Structured Output Evaluation Harness', format: 'Project' },
            ],
          },
          {
            id: 'ai-arch-m2',
            title: 'Hybrid Semantic & Lexical Retrieval Index',
            durationWeeks: 3,
            focusSkill: 'algorithmic_reasoning',
            deliverable: 'Benchmark recall@10 across 1,000 technical documents.',
            resources: [
              { title: 'Dense Passage Retrieval Foundations', format: 'Paper' },
              { title: 'Vector Quantization Lab', format: 'Course' },
            ],
          },
        ],
      },
      {
        stageNumber: 2,
        title: 'Distributed Inference & Coordination',
        objective: 'Scale concurrent agent workflows with bounded retry policies and cost governance.',
        milestones: [
          {
            id: 'ai-arch-m3',
            title: 'Fault-Tolerant Agent State Machine',
            durationWeeks: 3,
            focusSkill: 'systems_architecture',
            deliverable: 'Idempotent workflow engine with sliding-window rate limits.',
            resources: [
              { title: 'MIT 6.824 Distributed Systems Lectures', format: 'Course' },
              { title: 'Circuit Breakers & Backoff Patterns', format: 'Project' },
            ],
          },
          {
            id: 'ai-arch-m4',
            title: 'Full-Stack Streaming Telemetry Workbench',
            durationWeeks: 2,
            focusSkill: 'fullstack_engineering',
            deliverable: 'Real-time SSE trace inspector and regression suite.',
            resources: [
              { title: 'Server-Sent Events at Scale', format: 'Paper' },
              { title: 'Observability Trace Dashboard', format: 'Project' },
            ],
          },
        ],
      },
      {
        stageNumber: 3,
        title: 'Empirical Evaluation & Leadership',
        objective: 'Publish architecture RFCs backed by statistical ablation studies.',
        milestones: [
          {
            id: 'ai-arch-m5',
            title: 'Automated LLM-as-Judge Calibration Study',
            durationWeeks: 2,
            focusSkill: 'quantitative_literacy',
            deliverable: 'Statistical agreement report (Cohen kappa >= 0.82).',
            resources: [
              { title: 'Statistical Methods for Model Evaluation', format: 'Paper' },
              { title: 'Golden Dataset Calibration', format: 'Project' },
            ],
          },
          {
            id: 'ai-arch-m6',
            title: 'Capstone Architecture RFC & Defense',
            durationWeeks: 2,
            focusSkill: 'technical_communication',
            deliverable: 'Peer-reviewed production readiness specification.',
            resources: [
              { title: 'Staff Engineering Architecture RFC Guide', format: 'Book' },
              { title: 'Executive System Review Brief', format: 'Project' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'machine-learning-engineer',
    title: 'Machine Learning Engineer',
    domain: 'AI & ML',
    summary:
      'Train, fine-tune, and deploy statistical and neural models into reliable high-throughput production pipelines.',
    compensationRange: '$175k – $250k',
    demandOutlook: '+31% 5-Yr Growth',
    requiredSkills: {
      systems_architecture: 76,
      applied_ml: 92,
      algorithmic_reasoning: 84,
      fullstack_engineering: 70,
      quantitative_literacy: 88,
      technical_communication: 76,
    },
    coreCompetencies: [
      'PyTorch training & distributed optimization',
      'Feature stores & reproducible experiments',
      'Quantization & GPU throughput tuning',
      'Statistical error analysis & drift detection',
    ],
    stages: [
      {
        stageNumber: 1,
        title: 'Mathematical & Modeling Rigor',
        objective: 'Master optimization theory, generalization bounds, and clean experimental baselines.',
        milestones: [
          {
            id: 'mle-m1',
            title: 'Gradient Optimization & Regularization Study',
            durationWeeks: 3,
            focusSkill: 'quantitative_literacy',
            deliverable: 'Ablation notebook comparing AdamW, cosine schedules, and weight decay.',
            resources: [
              { title: 'Convex Optimization Foundations', format: 'Book' },
              { title: 'Reproducible Benchmark Harness', format: 'Project' },
            ],
          },
          {
            id: 'mle-m2',
            title: 'Transformer Fine-Tuning with LoRA',
            durationWeeks: 3,
            focusSkill: 'applied_ml',
            deliverable: 'Domain-adapted classifier with confusion-matrix audit.',
            resources: [
              { title: 'LoRA: Low-Rank Adaptation', format: 'Paper' },
              { title: 'Parameter-Efficient Training Lab', format: 'Course' },
            ],
          },
        ],
      },
      {
        stageNumber: 2,
        title: 'Production Inference & Data Pipelines',
        objective: 'Deploy quantized models behind monitored low-latency endpoints.',
        milestones: [
          {
            id: 'mle-m3',
            title: 'Batching & KV-Cache Throughput Profiler',
            durationWeeks: 3,
            focusSkill: 'systems_architecture',
            deliverable: 'P99 latency benchmark under concurrent load.',
            resources: [
              { title: 'Efficient Inference Systems', format: 'Course' },
              { title: 'Dynamic Batching Server', format: 'Project' },
            ],
          },
          {
            id: 'mle-m4',
            title: 'Automated Feature Drift Monitor',
            durationWeeks: 2,
            focusSkill: 'algorithmic_reasoning',
            deliverable: 'Streaming KS-test divergence alert pipeline.',
            resources: [
              { title: 'Continuous ML Monitoring', format: 'Paper' },
              { title: 'Drift Telemetry Service', format: 'Project' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'principal-product-engineer',
    title: 'Principal Product Engineer',
    domain: 'Product Engineering',
    summary:
      'Architect full-stack web platforms combining resilient backend data models, accessible design systems, and tactile UX.',
    compensationRange: '$170k – $235k',
    demandOutlook: '+22% 5-Yr Growth',
    requiredSkills: {
      systems_architecture: 80,
      applied_ml: 68,
      algorithmic_reasoning: 76,
      fullstack_engineering: 92,
      quantitative_literacy: 70,
      technical_communication: 88,
    },
    coreCompetencies: [
      'Design system architecture & WCAG AA craft',
      'End-to-end TypeScript & database security',
      'Client state synchronization & caching',
      'Product telemetry & cross-functional RFCs',
    ],
    stages: [
      {
        stageNumber: 1,
        title: 'Design Systems & Accessible Craft',
        objective: 'Build composable UI primitives with deterministic keyboard & screen-reader support.',
        milestones: [
          {
            id: 'ppe-m1',
            title: 'Tokenized Component Library & Contrast Audit',
            durationWeeks: 2,
            focusSkill: 'fullstack_engineering',
            deliverable: 'Accessible primitive suite verified against WCAG AA.',
            resources: [
              { title: 'Inclusive Design Patterns', format: 'Book' },
              { title: 'Design Token Architecture', format: 'Project' },
            ],
          },
          {
            id: 'ppe-m2',
            title: 'Zero-Trust Firestore & API Authorization',
            durationWeeks: 2,
            focusSkill: 'systems_architecture',
            deliverable: 'Schema-validated data layer with automated security tests.',
            resources: [
              { title: 'Attribute-Based Access Control', format: 'Paper' },
              { title: 'Auth Boundary Verification', format: 'Project' },
            ],
          },
        ],
      },
      {
        stageNumber: 2,
        title: 'Performance Engineering & Product Strategy',
        objective: 'Eliminate main-thread bottlenecks and align technical roadmaps to retention metrics.',
        milestones: [
          {
            id: 'ppe-m3',
            title: '60fps Canvas & Optimistic UI Engine',
            durationWeeks: 3,
            focusSkill: 'algorithmic_reasoning',
            deliverable: 'Zero-jank interactive workspace under throttled CPU.',
            resources: [
              { title: 'High-Performance Browser Networking', format: 'Book' },
              { title: 'Frame Budget Profiler', format: 'Project' },
            ],
          },
          {
            id: 'ppe-m4',
            title: 'Cross-Functional Architecture Proposal',
            durationWeeks: 2,
            focusSkill: 'technical_communication',
            deliverable: 'Quarterly platform roadmap with clear engineering tradeoffs.',
            resources: [
              { title: 'An Elegant Puzzle', format: 'Book' },
              { title: 'Platform Strategy Memo', format: 'Project' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'distributed-systems-engineer',
    title: 'Distributed Systems Engineer',
    domain: 'Systems',
    summary:
      'Engineer consensus protocols, high-availability storage engines, and globally replicated cloud infrastructure.',
    compensationRange: '$180k – $260k',
    demandOutlook: '+24% 5-Yr Growth',
    requiredSkills: {
      systems_architecture: 94,
      applied_ml: 55,
      algorithmic_reasoning: 90,
      fullstack_engineering: 74,
      quantitative_literacy: 78,
      technical_communication: 80,
    },
    coreCompetencies: [
      'Consensus protocols (Raft / Paxos)',
      'Storage engines & LSM-tree compaction',
      'Deterministic simulation testing',
      'Network partitioning & tail-latency reduction',
    ],
    stages: [
      {
        stageNumber: 1,
        title: 'Concurrency & Consensus',
        objective: 'Implement replicated state machines and prove safety under packet loss.',
        milestones: [
          {
            id: 'dse-m1',
            title: 'Replicated Raft Key-Value Store',
            durationWeeks: 4,
            focusSkill: 'systems_architecture',
            deliverable: 'Leader election and log compaction passing chaos tests.',
            resources: [
              { title: 'In Search of an Understandable Consensus Algorithm', format: 'Paper' },
              { title: 'Raft Simulation Lab', format: 'Project' },
            ],
          },
          {
            id: 'dse-m2',
            title: 'Lock-Free Concurrent Data Structures',
            durationWeeks: 3,
            focusSkill: 'algorithmic_reasoning',
            deliverable: 'Memory-safe concurrent skiplist benchmark.',
            resources: [
              { title: 'The Art of Multiprocessor Programming', format: 'Book' },
              { title: 'Contention Profiler', format: 'Project' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'quantitative-research-analyst',
    title: 'Quantitative Research Analyst',
    domain: 'Quantitative',
    summary:
      'Formulate mathematical models, stochastic simulations, and empirical validation pipelines for complex decision systems.',
    compensationRange: '$175k – $275k',
    demandOutlook: '+19% 5-Yr Growth',
    requiredSkills: {
      systems_architecture: 68,
      applied_ml: 80,
      algorithmic_reasoning: 88,
      fullstack_engineering: 62,
      quantitative_literacy: 95,
      technical_communication: 78,
    },
    coreCompetencies: [
      'Stochastic calculus & Bayesian inference',
      'Time-series econometrics & regime modeling',
      'Vectorized numerical simulation',
      'Out-of-sample backtesting rigor',
    ],
    stages: [
      {
        stageNumber: 1,
        title: 'Probabilistic & Time-Series Modeling',
        objective: 'Eliminate look-ahead bias and quantify uncertainty across non-stationary series.',
        milestones: [
          {
            id: 'qra-m1',
            title: 'Bayesian State-Space Calibration Engine',
            durationWeeks: 3,
            focusSkill: 'quantitative_literacy',
            deliverable: 'Posterior predictive validation across 10-year synthetic series.',
            resources: [
              { title: 'Bayesian Data Analysis', format: 'Book' },
              { title: 'Kalman Filter Benchmark', format: 'Project' },
            ],
          },
          {
            id: 'qra-m2',
            title: 'Walk-Forward Cross-Validation Framework',
            durationWeeks: 3,
            focusSkill: 'algorithmic_reasoning',
            deliverable: 'Leak-free simulation harness with transaction-cost modeling.',
            resources: [
              { title: 'Advances in Financial Machine Learning', format: 'Book' },
              { title: 'Backtest Rigor Suite', format: 'Project' },
            ],
          },
        ],
      },
    ],
  },
];

export const DEMO_STUDENT_PROFILE: StudentProfile = {
  uid: 'demo-elena-vance',
  displayName: 'Elena Vance',
  email: 'elena.vance@university.edu',
  photoURL: '/src/assets/images/avatar_student_default_1794636560220.jpg',
  role: 'student',
  academicTrack: 'B.S. Computer Science & Applied Mathematics',
  institution: 'Pacific Institute of Technology',
  graduationYear: 2027,
  careerInterests: ['AI Systems Architecture', 'Distributed Inference', 'Retrieval Engineering'],
  selectedCareerId: 'ai-systems-architect',
  skillScores: {
    systems_architecture: 78,
    applied_ml: 74,
    algorithmic_reasoning: 82,
    fullstack_engineering: 84,
    quantitative_literacy: 76,
    technical_communication: 81,
  },
  completedMilestones: ['ai-arch-m1', 'ai-arch-m2'],
  learningGoals: [
    {
      id: 'goal-1',
      title: 'Complete MIT 6.824 Raft consensus module',
      dueDate: 'Nov 24',
      completed: true,
      category: 'Systems',
    },
    {
      id: 'goal-2',
      title: 'Benchmark hybrid BM25 + dense vector retrieval recall',
      dueDate: 'Dec 02',
      completed: false,
      category: 'Applied ML',
    },
    {
      id: 'goal-3',
      title: 'Draft capstone architecture RFC for multi-agent router',
      dueDate: 'Dec 11',
      completed: false,
      category: 'Communication',
    },
  ],
  weeklyStudyHours: 14,
};

export const DEMO_ASSESSMENTS = [
  {
    id: 'assess-1',
    uid: 'demo-elena-vance',
    overallScore: 68,
    categoryScores: {
      systems_architecture: 62,
      applied_ml: 59,
      algorithmic_reasoning: 74,
      fullstack_engineering: 76,
      quantitative_literacy: 68,
      technical_communication: 71,
    },
    summaryNote: 'Baseline diagnostic completed at semester start; strong full-stack foundation.',
    createdAtLabel: 'Sep 14',
  },
  {
    id: 'assess-2',
    uid: 'demo-elena-vance',
    overallScore: 74,
    categoryScores: {
      systems_architecture: 70,
      applied_ml: 67,
      algorithmic_reasoning: 78,
      fullstack_engineering: 81,
      quantitative_literacy: 72,
      technical_communication: 76,
    },
    summaryNote: 'Midterm checkpoint following retrieval indexing and concurrency coursework.',
    createdAtLabel: 'Oct 18',
  },
  {
    id: 'assess-3',
    uid: 'demo-elena-vance',
    overallScore: 79,
    categoryScores: {
      systems_architecture: 78,
      applied_ml: 74,
      algorithmic_reasoning: 82,
      fullstack_engineering: 84,
      quantitative_literacy: 76,
      technical_communication: 81,
    },
    summaryNote: 'Current readiness profile; ready to advance into Stage 2 distributed inference.',
    createdAtLabel: 'Nov 10',
  },
];

export const DEMO_ACTIVITY = [
  {
    id: 'act-1',
    uid: 'demo-elena-vance',
    category: 'roadmap' as const,
    title: 'Completed Milestone: Hybrid Semantic & Lexical Retrieval Index',
    detail: 'Stage 01 · AI Systems Architect pathway',
    createdAtLabel: '2 days ago',
  },
  {
    id: 'act-2',
    uid: 'demo-elena-vance',
    category: 'assessment' as const,
    title: 'Diagnostic Re-evaluation Recorded (79% Composite)',
    detail: 'Systems Architecture improved +8 pts since October checkpoint',
    createdAtLabel: '4 days ago',
  },
  {
    id: 'act-3',
    uid: 'demo-elena-vance',
    category: 'mentor' as const,
    title: 'Consulted Curriculum Architect on Stage 2 Pacing',
    detail: 'Generated 3-week fault-tolerant state machine study cadence',
    createdAtLabel: '6 days ago',
  },
  {
    id: 'act-4',
    uid: 'demo-elena-vance',
    category: 'career' as const,
    title: 'Benchmarked Target Role: AI Systems Architect',
    detail: 'Aligned 6 competency thresholds against academic curriculum',
    createdAtLabel: '1 week ago',
  },
];

export const DEMO_ADMIN_STUDENTS = [
  {
    uid: 'demo-elena-vance',
    displayName: 'Elena Vance',
    email: 'elena.vance@university.edu',
    role: 'student' as const,
    academicTrack: 'B.S. Computer Science & Applied Math',
    institution: 'Pacific Institute of Technology',
    selectedCareerTitle: 'AI Systems Architect',
    readinessScore: 86,
    roadmapPercent: 33,
    weeklyStudyHours: 14,
  },
  {
    uid: 'demo-marcus-chen',
    displayName: 'Marcus Chen',
    email: 'm.chen@university.edu',
    role: 'student' as const,
    academicTrack: 'M.S. Machine Learning Systems',
    institution: 'Pacific Institute of Technology',
    selectedCareerTitle: 'Machine Learning Engineer',
    readinessScore: 91,
    roadmapPercent: 75,
    weeklyStudyHours: 18,
  },
  {
    uid: 'demo-priya-nair',
    displayName: 'Priya Nair',
    email: 'priya.nair@university.edu',
    role: 'student' as const,
    academicTrack: 'B.S. Software Engineering',
    institution: 'Pacific Institute of Technology',
    selectedCareerTitle: 'Principal Product Engineer',
    readinessScore: 82,
    roadmapPercent: 50,
    weeklyStudyHours: 12,
  },
  {
    uid: 'demo-julian-hart',
    displayName: 'Julian Hart',
    email: 'j.hart@university.edu',
    role: 'student' as const,
    academicTrack: 'B.S. Quantitative Finance & CS',
    institution: 'Pacific Institute of Technology',
    selectedCareerTitle: 'Quantitative Research Analyst',
    readinessScore: 77,
    roadmapPercent: 50,
    weeklyStudyHours: 11,
  },
  {
    uid: 'demo-sora-takahashi',
    displayName: 'Sora Takahashi',
    email: 's.takahashi@university.edu',
    role: 'student' as const,
    academicTrack: 'M.S. Distributed Computing',
    institution: 'Pacific Institute of Technology',
    selectedCareerTitle: 'Distributed Systems Engineer',
    readinessScore: 89,
    roadmapPercent: 100,
    weeklyStudyHours: 16,
  },
];

export const DEFAULT_NEW_STUDENT_GOALS: LearningGoal[] = [
  {
    id: 'init-goal-1',
    title: 'Complete baseline skill diagnostic across 6 core pillars',
    dueDate: 'This week',
    completed: false,
    category: 'Assessment',
  },
  {
    id: 'init-goal-2',
    title: 'Select primary career pathway and inspect Stage 01 milestones',
    dueDate: 'Next week',
    completed: false,
    category: 'Roadmap',
  },
];
