/**
 * Knowledge pack for Plan module.
 * Source of truth for plan_template, plan_brainstorm, and plan_check.
 * Harmonized with docs/TEMPLATES.md and denvora-ai-skills references/prd-blueprint.md.
 */

export interface TemplateSectionDef {
  id: string;
  titleEn: string;
  titleId: string;
  required: boolean; // required in 'lite'
  fullOnly: boolean; // only present in 'full'
  purposeEn: string;
  purposeId: string;
  hintEn: string;
  hintId: string;
  exampleEn: string;
  exampleId: string;
}

export interface TemplateDef {
  type: string;
  titleEn: string;
  titleId: string;
  sections: TemplateSectionDef[];
}

export const TEMPLATES_PACK: Record<string, TemplateDef> = {
  brief: {
    type: 'brief',
    titleEn: 'Project Idea Brief',
    titleId: 'Ringkasan Ide Proyek',
    sections: [
      {
        id: 'one_sentence',
        titleEn: 'Idea in One Sentence',
        titleId: 'Ide dalam Satu Kalimat',
        required: true,
        fullOnly: false,
        purposeEn: 'State the core concept clearly and concisely.',
        purposeId: 'Menjelaskan konsep utama secara ringkas dan padat.',
        hintEn: "If you can't say it in one sentence, the idea isn't clear yet.",
        hintId: 'Kalau belum bisa diringkas dalam satu kalimat, idenya masih butuh diperjelas.',
        exampleEn: 'A minimalist personal finance tracker that logs daily expenses in under 5 seconds.',
        exampleId: 'Aplikasi pencatat pengeluaran harian minimalis yang selesai dalam waktu kurang dari 5 detik.',
      },
      {
        id: 'target_users',
        titleEn: 'Target Users',
        titleId: 'Untuk Siapa',
        required: true,
        fullOnly: false,
        purposeEn: 'Define who will use this product.',
        purposeId: 'Menentukan siapa pengguna nyata dari aplikasi ini.',
        hintEn: 'Describe one real kind of person, not "everyone".',
        hintId: 'Gambarkan satu tipe pengguna yang jelas, jangan sebut "semua orang".',
        exampleEn: 'Freelancers and students who find existing spreadsheet templates too tedious.',
        exampleId: 'Pekerja lepas dan mahasiswa yang merasa aplikasi akuntansi biasa terlalu ribet.',
      },
      {
        id: 'core_problem',
        titleEn: 'Problem Solved',
        titleId: 'Masalah yang Diselesaikan',
        required: true,
        fullOnly: false,
        purposeEn: 'Highlight the daily pain point being solved.',
        purposeId: 'Masalah atau kerepotan harian yang ingin diselesaikan.',
        hintEn: 'What is hard, painful, or annoying for them today?',
        hintId: 'Apa yang membuat mereka malas atau repot saat ini?',
        exampleEn: 'People stop tracking expenses because opening heavy apps takes too many steps.',
        exampleId: 'Orang malas mencatat karena aplikasi yang ada butuh terlalu banyak klik dan loading lama.',
      },
      {
        id: 'desired_outcome',
        titleEn: 'Desired Outcome',
        titleId: 'Hasil yang Diharapkan',
        required: true,
        fullOnly: false,
        purposeEn: 'Define what success looks like.',
        purposeId: 'Definisi hasil sukses yang dirasakan pengguna.',
        hintEn: 'What does success look like for the user at the end of the day?',
        hintId: 'Seperti apa kondisi ideal setelah pengguna memakai aplikasi ini?',
        exampleEn: 'User knows their monthly spending total without spending more than 1 minute per day.',
        exampleId: 'Pengguna tahu total pengeluaran bulanan tanpa perlu meluangkan lebih dari 1 menit per hari.',
      },
      {
        id: 'constraints',
        titleEn: 'Constraints & Reality',
        titleId: 'Batasan Nyata (Waktu, Biaya, Skill)',
        required: true,
        fullOnly: false,
        purposeEn: 'Grounded limitations to keep the scope realistic.',
        purposeId: 'Batasan nyata agar rencana tetap membumi dan selesai.',
        hintEn: 'Be honest. Clear constraints make plans realistic.',
        hintId: 'Jujur dengan batasan. Batasan waktu dan kemampuan membuat rencana realistis.',
        exampleEn: 'Built in 2 weeks spare time (10 hours/week), zero monthly hosting budget.',
        exampleId: 'Dikerjakan dalam 2 minggu waktu luang (10 jam/minggu), tanpa biaya hosting bulanan.',
      },
      {
        id: 'assumptions',
        titleEn: 'Assumptions',
        titleId: 'Asumsi Awal',
        required: true,
        fullOnly: false,
        purposeEn: 'Beliefs that need confirmation.',
        purposeId: 'Hal yang kita percayai namun belum terbukti pasti.',
        hintEn: 'Things you believe are true but have not tested yet.',
        hintId: 'Asumsi default yang dipilih sebelum ada riset lanjutan.',
        exampleEn: 'Users prefer local offline storage over cloud sync for privacy.',
        exampleId: 'Pengguna lebih nyaman data tersimpan lokal di browser daripada di server cloud.',
      },
    ],
  },

  prd: {
    type: 'prd',
    titleEn: 'Product Requirements Blueprint (SDD)',
    titleId: 'Cetak Biru Spesifikasi Produk (SDD)',
    sections: [
      {
        id: 'overview',
        titleEn: 'Overview & Problem Statement',
        titleId: 'Ringkasan & Masalah',
        required: true,
        fullOnly: false,
        purposeEn: 'Plain-language summary of what it does, target user, and core pain point.',
        purposeId: 'Ringkasan bahasa santai mengenai fungsi utama, pengguna, dan masalah yang diatasi.',
        hintEn: '1-2 plain sentences on what it does and why it matters.',
        hintId: '1-2 kalimat ringkas bahasa santai: apa fungsinya dan kenapa penting dibuat.',
        exampleEn: 'A fast SQLite-backed invoice generator for solo contractors who need clean PDF invoices.',
        exampleId: 'Generator invoice berbasis web ringan untuk freelancer yang butuh cetak invoice PDF cepat.',
      },
      {
        id: 'scope_non_goals',
        titleEn: 'Scope & Explicit Non-Goals',
        titleId: 'Cakupan Fitur & Batasan (Scope & Non-Goals)',
        required: true,
        fullOnly: false,
        purposeEn: 'List in-scope v1 features and explicit non-goals (YAGNI) to avoid scope creep.',
        purposeId: 'Daftar fitur v1 dan hal yang sengaja ditunda (YAGNI) agar proyek cepat tuntas.',
        hintEn: 'Be ruthless with non-goals. Defer complex microservices, analytics, or payment gateways.',
        hintId: 'Tulis fitur yang ditunda dulu untuk mencegah over-engineering.',
        exampleEn: 'In Scope: Create invoice, export PDF. Non-goals: Payment gateway, multi-currency, multi-user accounts.',
        exampleId: 'Fitur v1: Buat invoice, unduh PDF. Yang Ditunda: Payment gateway, multi-mata uang, sistem akun multi-user.',
      },
      {
        id: 'tech_stack_data_model',
        titleEn: 'Tech Stack & Architecture',
        titleId: 'Struktur Teknis & Model Data',
        required: true,
        fullOnly: false,
        purposeEn: 'Technologies, data model entities, and key API/route contracts.',
        purposeId: 'Framework, database, model data (entitas), dan rute/alur utama.',
        hintEn: 'Define simple data entities and clear routes before writing implementation code.',
        hintId: 'Tulis entitas tabel data dan rute sebelum mulai mengoding.',
        exampleEn: 'Stack: Next.js 15, Tailwind v4, SQLite. Entities: User(id, name), Invoice(id, amount, status).',
        exampleId: 'Stack: Node.js, Express, SQLite. Model: Invoice(id, nomor, nominal, tanggal, status).',
      },
      {
        id: 'slice_plan',
        titleEn: 'Slice Implementation Plan (Sequential & Independent)',
        titleId: 'Rencana Pengerjaan Bertahap (Slices)',
        required: true,
        fullOnly: false,
        purposeEn: '3 to 7 sequential, independently verifiable slices.',
        purposeId: '3 sampai 7 langkah pengerjaan bertahap yang masing-masing bisa dicek mandiri.',
        hintEn: 'Never combine DB, API, and UI in one unreviewed turn. Keep each slice atomic.',
        hintId: 'Jangan campur database, logika, dan tampilan sekaligus dalam satu langkah.',
        exampleEn: 'Slice 1: Scaffolding. Slice 2: Database schema. Slice 3: PDF generator. Slice 4: UI Form.',
        exampleId: 'Langkah 1: Setup fondasi. Langkah 2: Model database. Langkah 3: Logika cetak PDF. Langkah 4: Tampilan form input.',
      },
      {
        id: 'verification_criteria',
        titleEn: 'Verification & Acceptance Criteria',
        titleId: 'Bukti Selesai (Kriteria Verifikasi)',
        required: true,
        fullOnly: false,
        purposeEn: 'Automated commands and checkable criteria to prove the build works.',
        purposeId: 'Perintah terminal dan kriteria lulus yang membuktikan hasil kerja nyata.',
        hintEn: 'Must include: build succeeds with 0 errors, core flow tested, clean project state, zero leaked secrets.',
        hintId: 'Wajib mencakup: build 0 error, alur utama jalan, bebas file sampah, dan tanpa bocoran .env.',
        exampleEn: '- [ ] `npm run build` exits 0\n- [ ] Invoice downloads properly in Chrome\n- [ ] Zero .env secrets exposed',
        exampleId: '- [ ] Perintah `npm run build` sukses 0 error\n- [ ] PDF invoice terunduh dan terbaca\n- [ ] Tidak ada file .env atau secret yang bocor',
      },
      {
        id: 'assumptions_defaults',
        titleEn: 'Assumptions & Defaults',
        titleId: 'Asumsi yang Dipilih',
        required: true,
        fullOnly: false,
        purposeEn: 'Sensible defaults chosen to avoid unnecessary blocking questions.',
        purposeId: 'Pilihan default yang masuk akal agar tidak perlu menanyakan pertanyaan sepele ke pengguna.',
        hintEn: 'State defaults chosen (e.g. SQLite locally, default language) to unblock building.',
        hintId: 'Sebutkan default yang dipilih (misal: pakai SQLite lokal dulu).',
        exampleEn: 'Default currency IDR, local SQLite storage without external server setup.',
        exampleId: 'Mata uang default Rupiah, database SQLite lokal tanpa perlu sewa server cloud.',
      },
      // Full level extensions
      {
        id: 'user_flow',
        titleEn: 'User Flow & Edge Cases',
        titleId: 'Alur Pengguna & Penanganan Kasus',
        required: false,
        fullOnly: true,
        purposeEn: 'Step-by-step user journey and error boundary behavior.',
        purposeId: 'Langkah demi langkah pengguna dari awal sampai selesai beserta antisipasi error.',
        hintEn: 'Describe happy path, empty states, and validation failures.',
        hintId: 'Jelaskan alur normal, tampilan saat data kosong, dan penanganan input salah.',
        exampleEn: 'User opens form -> fills items -> previews PDF -> clicks download. If empty, highlight input.',
        exampleId: 'Pengguna buka halaman -> isi data -> preview invoice -> klik download. Jika kosong, muncul tanda merah.',
      },
      {
        id: 'risks_pre_mortem',
        titleEn: 'Risks & Pre-Mortem',
        titleId: 'Risiko & Antisipasi Kegagalan',
        required: false,
        fullOnly: true,
        purposeEn: 'Anticipate failure modes early.',
        purposeId: 'Menganalisis potensi masalah sebelum terjadi.',
        hintEn: 'Imagine failure 3 months from now: what caused it and how do we prevent it?',
        hintId: 'Bayangkan proyek macet atau gagal 3 bulan lagi: apa sebabnya dan bagaimana mencegahnya?',
        exampleEn: 'Risk: PDF layout breaks on mobile screens. Mitigation: Test viewport with responsive CSS print styles.',
        exampleId: 'Risiko: Layout invoice berantakan di layar HP. Mitigasi: Pakai print stylesheet standar.',
      },
    ],
  },

  tasks: {
    type: 'tasks',
    titleEn: 'Verifiable Slice Tasks',
    titleId: 'Daftar Tugas Berbasis Verifikasi',
    sections: [
      {
        id: 'task_list',
        titleEn: 'Task Decomposition',
        titleId: 'Daftar Tugas Bertahap',
        required: true,
        fullOnly: false,
        purposeEn: 'Small checklist items with explicit verify steps and dependency markers.',
        purposeId: 'Daftar tugas kecil dengan kriteria verifikasi dan dependensi [after: Tx].',
        hintEn: 'Format: - [ ] T1 Task description [after: T0] [verify: command or check]',
        hintId: 'Format: - [ ] T1 Deskripsi tugas [after: T0] [verify: perintah tes]',
        exampleEn: '- [ ] T1 Project setup [verify: npm run build passes]\n- [ ] T2 Data model [after: T1] [verify: test passes]',
        exampleId: '- [ ] T1 Setup proyek [verify: npm run build sukses]\n- [ ] T2 Model data [after: T1] [verify: database bisa simpan data]',
      },
    ],
  },
};

/**
 * Vague terms dictionary that plan_check flags when present without numbers or measurable conditions.
 */
export const VAGUE_TERMS = [
  'fast',
  'quick',
  'easy',
  'simple',
  'intuitive',
  'user-friendly',
  'modern',
  'beautiful',
  'clean',
  'scalable',
  'robust',
  'secure',
  'flexible',
  'seamless',
  'efficient',
  'optimal',
  'high quality',
  // Indonesian terms
  'cepat',
  'mudah',
  'simpel',
  'sederhana',
  'modern',
  'bagus',
  'keren',
  'aman',
  'fleksibel',
  'lancar',
  'efisien',
  'berkualitas',
];
