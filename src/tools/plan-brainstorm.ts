/**
 * plan_brainstorm tool handler.
 * Generates targeted clarifying questions and scope reduction frameworks.
 * Harmonized with docs/TOOLS.md and docs/TEMPLATES.md.
 */

import { createResult, ResultEnvelope } from '../core/result.js';

export interface PlanBrainstormInput {
  idea?: string;
  context?: string;
  stage?: 'explore' | 'shape' | 'scope' | 'validate' | 'idea' | 'tech' | 'tasks';
  known?: Record<string, any>;
  framework?: string;
  language?: 'en' | 'id';
}

export interface BlockingQuestion {
  id: string;
  question: string;
  why: string;
  options?: string[];
}

export interface FrameworkItem {
  id: string;
  name: string;
  steps: string[];
  purpose?: string;
}

export interface PlanBrainstormData {
  blockingQuestions: BlockingQuestion[];
  frameworks: FrameworkItem[];
  assumptionsToConfirm: string[];
  nextStep: string;
  // Backward compatibility fields
  stage: string;
  framework: string;
  frameworkName: string;
  questions: string[];
}

export async function handlePlanBrainstorm(
  input: PlanBrainstormInput
): Promise<ResultEnvelope<PlanBrainstormData>> {
  const ideaText = input.idea || input.context || '';
  const rawStage = (input.stage || 'explore').toLowerCase();
  const language = input.language || 'en';
  const isId = language === 'id';
  const known = input.known || {};

  // Map stage synonyms: explore -> idea, shape -> scope, validate -> tasks
  let normalizedStage: 'explore' | 'shape' | 'scope' | 'validate';
  if (rawStage === 'idea' || rawStage === 'explore') {
    normalizedStage = 'explore';
  } else if (rawStage === 'shape' || rawStage === 'tech') {
    normalizedStage = 'shape';
  } else if (rawStage === 'scope') {
    normalizedStage = 'scope';
  } else {
    normalizedStage = 'validate';
  }

  // Pre-seed candidate questions with metadata (why, options, topic key)
  interface CandidateQuestion {
    id: string;
    topic: string;
    question: string;
    why: string;
    options: string[];
  }

  const allCandidates: Record<'explore' | 'shape' | 'scope' | 'validate', CandidateQuestion[]> = {
    explore: isId
      ? [
          {
            id: 'q_target',
            topic: 'audience',
            question: 'Siapa 1 profil pengguna nyata yang paling merasakan masalah ini hari ini?',
            why: 'Agar fitur dan bahasa aplikasi tepat sasaran, bukan untuk "semua orang".',
            options: ['Mahasiswa / Pemula', 'Freelancer / Profesional mandiri', 'Tim kecil / Usaha lokal'],
          },
          {
            id: 'q_workaround',
            topic: 'workaround',
            question: 'Bagaimana cara mereka mengatasi kerepotan tersebut saat ini tanpa aplikasi ini?',
            why: 'Menemukan kebiasaan lama yang harus digantikan oleh solusi baru.',
            options: ['Catatan manual / Spreadsheet', 'Aplikasi gratis lain yang ribet', 'Belum ada / dibiarkan saja'],
          },
          {
            id: 'q_outcome',
            topic: 'outcome',
            question: 'Setelah fitur selesai, apa hasil konkret yang langsung mereka nikmati?',
            why: 'Menjadi patokan nilai utama dari versi v1.',
            options: ['Selesai dalam hitungan detik', 'Otomatis tanpa input manual berulang', 'Laporan jelas tanpa pusing'],
          },
        ]
      : [
          {
            id: 'q_target',
            topic: 'audience',
            question: 'Who is the single primary user suffering from this pain point today?',
            why: 'Defines clear user empathy and avoids building generic features for "everyone".',
            options: ['Students / Beginners', 'Freelancers / Solo founders', 'Small local business teams'],
          },
          {
            id: 'q_workaround',
            topic: 'workaround',
            question: 'How do they currently work around this issue without this tool?',
            why: 'Identifies existing habits that your tool needs to outperform.',
            options: ['Manual spreadsheets / Notes', 'Clunky existing apps', 'Nothing / Left unsolved'],
          },
          {
            id: 'q_outcome',
            topic: 'outcome',
            question: 'What immediate observable outcome marks success once they use your solution?',
            why: 'Provides the primary value metric for v1 delivery.',
            options: ['Completes in seconds', 'Fully automated background task', 'Clear actionable summary report'],
          },
        ],

    shape: isId
      ? [
          {
            id: 'q_platform',
            topic: 'platform',
            question: 'Antarmuka apa yang paling praktis: Web, CLI (terminal), atau Mobile?',
            why: 'Menentukan fondasi arsitektur dan pustaka yang digunakan.',
            options: ['Web App (Responsive)', 'CLI Tool / Node.js terminal', 'Mobile Web / Progressive Web App'],
          },
          {
            id: 'q_storage',
            topic: 'storage',
            question: 'Apakah data cukup disimpan lokal di perangkat (SQLite / LocalStorage) atau butuh Cloud DB?',
            why: 'Penyimpanan lokal menghindari kerumitan server dan biaya di awal.',
            options: ['Lokal di perangkat (SQLite / JSON)', 'Database cloud (PostgreSQL / Supabase)', 'Tanpa simpan data permanen'],
          },
          {
            id: 'q_tech',
            topic: 'stack',
            question: 'Bahasa atau ekosistem apa yang paling Anda kuasai untuk pengembangan ini?',
            why: 'Memilih ekosistem yang familiar mempercepat rilis tanpa hambatan belajar stack baru.',
            options: ['TypeScript / Node.js', 'Python', 'React / Next.js'],
          },
        ]
      : [
          {
            id: 'q_platform',
            topic: 'platform',
            question: 'What interface is most practical: Web, CLI tool, or Mobile?',
            why: 'Dictates the architectural foundation and primary libraries.',
            options: ['Responsive Web App', 'CLI Terminal tool', 'Mobile Progressive Web App'],
          },
          {
            id: 'q_storage',
            topic: 'storage',
            question: 'Is local storage (SQLite / JSON) sufficient for v1, or is a Cloud DB mandatory?',
            why: 'Local storage eliminates hosting cost and server complexity for initial milestones.',
            options: ['Local SQLite / File cache', 'Cloud database (Postgres / Supabase)', 'Stateless in-memory'],
          },
          {
            id: 'q_tech',
            topic: 'stack',
            question: 'Which programming ecosystem are you most comfortable running and debugging locally?',
            why: 'Familiar tooling ensures rapid iterations without learning curve friction.',
            options: ['TypeScript / Node.js', 'Python', 'React / Next.js'],
          },
        ],

    scope: isId
      ? [
          {
            id: 'q_must',
            topic: 'core_feature',
            question: 'Apa 1 fitur mutlak yang jika tidak ada, proyek ini tidak memiliki fungsi?',
            why: 'Memisahkan esensi inti dari fitur pemanis.',
            options: ['Fungsi input dan kalkulasi utama', 'Ekspor / unduh laporan', 'Verifikasi otomatis'],
          },
          {
            id: 'q_delay',
            topic: 'postponed',
            question: 'Fitur apa yang bisa ditunda ke v2 agar v1 selesai dalam hitungan hari?',
            why: 'Mencegah pembengkakan cakupan (scope creep).',
            options: ['Login akun dan otentikasi', 'Tema visual kustom', 'Integrasi pihak ketiga'],
          },
          {
            id: 'q_time',
            topic: 'time_budget',
            question: 'Berapa perkiraan jam per minggu yang realistis untuk mengerjakan proyek ini?',
            why: 'Menjaga ukuran tugas sesuai kapasitas nyata pembuatnya.',
            options: ['5-10 jam/minggu (waktu luang)', '10-20 jam/minggu', 'Penuh waktu'],
          },
        ]
      : [
          {
            id: 'q_must',
            topic: 'core_feature',
            question: 'What is the single core feature without which this app serves zero purpose?',
            why: 'Separates essential value from secondary nice-to-haves.',
            options: ['Core processing & calculation', 'Export / generation output', 'Automated verification'],
          },
          {
            id: 'q_delay',
            topic: 'postponed',
            question: 'What features can be postponed to v2 so v1 ships in days?',
            why: 'Prevents scope creep and ensures guaranteed completion.',
            options: ['User authentication & login', 'Custom themes & styling', 'Third-party integrations'],
          },
          {
            id: 'q_time',
            topic: 'time_budget',
            question: 'How many hours per week can you realistically commit to building this?',
            why: 'Calibrates task slicing to match developer reality.',
            options: ['5-10 hours/week (spare time)', '10-20 hours/week', 'Full time focus'],
          },
        ],

    validate: isId
      ? [
          {
            id: 'q_verify_first',
            topic: 'first_slice',
            question: 'Apa irisan teknis pertama yang bisa kita tes langsung untuk membuktikan fondasi?',
            why: 'Memastikan fondasi stabil sebelum membangun fitur di atasnya.',
            options: ['CLI build & hello-world', 'Koneksi skema data', 'Validasi parser'],
          },
          {
            id: 'q_verify_logic',
            topic: 'test_logic',
            question: 'Bagaimana cara memverifikasi logika utama bekerja dengan tes deterministik?',
            why: 'Menghindari tebak-tebakan saat integrasi.',
            options: ['Unit test vitest / jest', 'Skrip tes otomatis lokal', 'Manual checklist'],
          },
          {
            id: 'q_acceptance',
            topic: 'acceptance',
            question: 'Apa kriteria pasti yang menandakan v1 selesai dan siap rilis?',
            why: 'Definisi selesai yang jelas menghentikan penambahan fitur tiada henti.',
            options: ['0 error build + semua tes lulus', 'End-to-end demo berhasil', 'Bebas kredensial dan error'],
          },
        ]
      : [
          {
            id: 'q_verify_first',
            topic: 'first_slice',
            question: 'What is the first atomic technical slice we can test to prove the foundation works?',
            why: 'Ensures rock-solid scaffolding before building complex logic.',
            options: ['CLI build & clean test', 'Data schema setup', 'Parser test suite'],
          },
          {
            id: 'q_verify_logic',
            topic: 'test_logic',
            question: 'How will we verify core business logic with deterministic test evidence?',
            why: 'Eliminates guesswork during feature implementation.',
            options: ['Vitest unit test suite', 'Automated scratch runner', 'Strict checklist'],
          },
          {
            id: 'q_acceptance',
            topic: 'acceptance',
            question: 'What exact acceptance criterion defines when this v1 milestone is complete?',
            why: 'Clear definition of done prevents endless perfectionist drift.',
            options: ['0 build errors + all tests pass', 'End-to-end happy path passes', 'Zero leaked secrets + clean hygiene'],
          },
        ],
  };

  // Rule: Filter out questions if `known` already contains the topic/answer!
  // E.g. known: { audience: 'students', platform: 'web' }
  const candidates = allCandidates[normalizedStage];
  const knownKeys = Object.keys(known).map((k) => k.toLowerCase());

  const filtered = candidates.filter((c) => {
    // If user provided a known key matching topic, skip this question
    return !knownKeys.some(
      (k) =>
        k.includes(c.topic) ||
        c.topic.includes(k) ||
        (c.topic === 'audience' && (k.includes('user') || k.includes('target'))) ||
        (c.topic === 'platform' && (k.includes('ui') || k.includes('device'))) ||
        (c.topic === 'stack' && (k.includes('tech') || k.includes('language')))
    );
  });

  // At most 3 questions
  const selectedQuestions = (filtered.length > 0 ? filtered : candidates).slice(0, 3);

  const blockingQuestions: BlockingQuestion[] = selectedQuestions.map((q) => ({
    id: q.id,
    question: q.question,
    why: q.why,
    options: q.options,
  }));

  const frameworks: FrameworkItem[] = isId
    ? [
        {
          id: 'moscow',
          name: 'Prioritisasi MoSCoW',
          steps: ['Must have (Mutlak)', 'Should have (Penting)', 'Could have (Pemanis)', "Won't have (Ditunda)"],
          purpose: 'Memilah fitur wajib dan menunda fitur opsional agar v1 lekas rilis.',
        },
        {
          id: 'smallest_lovable',
          name: 'Versi Minimal yang Dicintai (Smallest Lovable v1)',
          steps: ['Esensi nilai utama', 'Tanpa login di v1', 'Simpan lokal di perangkat'],
          purpose: 'Menjaga ruang lingkup tetap kecil tapi memuaskan pemakai.',
        },
      ]
    : [
        {
          id: 'moscow',
          name: 'MoSCoW Prioritization',
          steps: ['Must have', 'Should have', 'Could have', "Won't have"],
          purpose: 'Categorize features strictly to ship v1 fast.',
        },
        {
          id: 'smallest_lovable',
          name: 'Smallest Lovable v1',
          steps: ['Core value delivery', 'No auth in v1', 'Local storage first'],
          purpose: 'Keep scope tight while delivering a delighting user experience.',
        },
      ];

  const assumptionsToConfirm: string[] = isId
    ? [
        'Versi v1 fokus pada fungsi tunggal tanpa otentikasi login yang rumit.',
        'Penyimpanan data lokal dipilih sebagai default untuk privasi dan kecepatan.',
      ]
    : [
        'Version 1 focuses on single-core function without heavy authentication overhead.',
        'Local storage is preferred by default for privacy, zero hosting cost, and speed.',
      ];

  const nextStep = isId
    ? 'Pilih jawaban di atas atau terima default, lalu gunakan plan_template untuk membuat PRD Blueprint.'
    : 'Select answers or accept recommended defaults, then generate a PRD Blueprint using plan_template.';

  const plainQuestions = blockingQuestions.map((b) => b.question);

  return createResult<PlanBrainstormData>({
    tool: 'plan_brainstorm',
    verdict: 'verified',
    confidence: 'high',
    data: {
      blockingQuestions,
      frameworks,
      assumptionsToConfirm,
      nextStep,
      // Backward compatibility fields
      stage: normalizedStage,
      framework: frameworks[0]?.id || '',
      frameworkName: frameworks[0]?.name || '',
      questions: plainQuestions,
    },
    evidence: [
      {
        type: 'project-file',
        ref: 'docs/TEMPLATES.md',
        detail: `Generated ${blockingQuestions.length} clarifying questions for stage '${normalizedStage}'`,
      },
    ],
    warnings: [],
  });
}
