/**
 * plan_check tool handler.
 * Automated verification and gap detection for project plans.
 * Enforces quality gates in docs/TOOLS.md and docs/TEMPLATES.md.
 */

import { VAGUE_TERMS, TEMPLATES_PACK } from '../plan/pack.js';
import { createResult, createUnverifiable, ResultEnvelope } from '../core/result.js';
import { redactSecrets } from '../core/sanitize.js';

export interface PlanCheckInput {
  doc?: string;
  type?: string;
  text?: string;
  content?: string;
  context?: {
    tasksText?: string;
    prdText?: string;
    [key: string]: any;
  };
  language?: 'en' | 'id';
}

export interface PlanIssue {
  id?: string;
  severity: 'blocker' | 'warning' | 'hint' | 'note';
  section: string;
  issue: string;
  message?: string;
  fix: string;
}

export interface VagueTermMatch {
  term: string;
  section: string;
  suggestion: string;
}

export interface CrossCheckMatch {
  type: string;
  item: string;
}

export interface PlanCheckData {
  doc: string;
  type: string;
  status: 'ready' | 'needs-work';
  score: {
    required: string;
    issues: number;
  };
  issues: PlanIssue[];
  missingSections: string[];
  vagueTerms: VagueTermMatch[];
  crossChecks: CrossCheckMatch[];
  // Compatibility fields
  issueCount: number;
  blockerCount: number;
  warningCount: number;
  summary: string;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function handlePlanCheck(input: PlanCheckInput): Promise<ResultEnvelope<PlanCheckData>> {
  const typeKey = (input.doc || input.type || 'prd').toLowerCase().trim();
  const rawText = input.text || input.content || '';
  const content = rawText.trim();
  const language = input.language || 'en';
  const isId = language === 'id';
  const context = input.context || {};

  if (!content) {
    return createUnverifiable(
      'plan_check',
      'invalid_input',
      'Plan content must not be empty',
      {
        doc: typeKey,
        type: typeKey,
        status: 'needs-work',
        score: {
          required: '0/0',
          issues: 1,
        },
        issues: [
          {
            id: 'doc-empty',
            severity: 'blocker',
            section: 'Document Root',
            issue: 'Plan content is empty',
            message: 'Plan content is empty',
            fix: 'Provide the markdown text of your plan or blueprint to analyze',
          },
        ],
        missingSections: [],
        vagueTerms: [],
        crossChecks: [],
        issueCount: 1,
        blockerCount: 1,
        warningCount: 0,
        summary: 'Cannot analyze empty document',
      }
    );
  }

  const issues: PlanIssue[] = [];
  const missingSections: string[] = [];
  const vagueTerms: VagueTermMatch[] = [];
  const crossChecks: CrossCheckMatch[] = [];

  // 1. Secret & Privacy Shield check on Markdown content using centralized redactSecrets
  const sanitized = redactSecrets(content);
  if (sanitized !== content) {
    const msg = isId
      ? 'Ditemukan pola kredensial atau API key di dalam dokumen rencana.'
      : 'Potential secret key or credential found in the plan document.';
    const fix = isId
      ? 'Hapus API key dan ganti dengan placeholder [REDACTED_SECRET].'
      : 'Remove credentials and replace with [REDACTED_SECRET].';

    issues.push({
      id: 'secret-shield-leak',
      severity: 'blocker',
      section: 'Security & Privacy Shield',
      issue: msg,
      message: msg,
      fix,
    });
  }

  // 2. Check required sections if standard template type is known
  const templateDef = TEMPLATES_PACK[typeKey];
  let requiredCount = 0;
  let requiredFound = 0;

  if (templateDef) {
    for (const sec of templateDef.sections) {
      if (sec.required) {
        requiredCount++;

        // Extract base titles without parentheses for flexible matching
        const baseEn = (sec.titleEn.split('(')[0] || '').trim();
        const baseId = (sec.titleId.split('(')[0] || '').trim();

        const patterns = [
          escapeRegex(sec.titleEn),
          escapeRegex(sec.titleId),
          escapeRegex(baseEn),
          escapeRegex(baseId),
        ];

        const patternString = patterns.join('|');
        const titleRegex = new RegExp(`(?:##\\s*\\d*\\.?\\s*(?:${patternString}))`, 'i');
        const hasSection = titleRegex.test(content);

        if (hasSection) {
          requiredFound++;
        } else {
          const secName = isId ? sec.titleId : sec.titleEn;
          missingSections.push(secName);
          const msg = isId
            ? `Bagian wajib '${sec.titleId}' belum ada dalam dokumen.`
            : `Required section '${sec.titleEn}' is missing.`;
          const fix = isId
            ? `Tambahkan '## ${sec.titleId}' dengan ringkasan singkat.`
            : `Add '## ${sec.titleEn}' with relevant details.`;

          issues.push({
            id: `missing-sec-${sec.id}`,
            severity: 'blocker',
            section: secName,
            issue: msg,
            message: msg,
            fix,
          });
        }
      }
    }
  }

  // 3. Vague terms check (without measurable condition or numbers nearby)
  for (const term of VAGUE_TERMS) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      const idx = match.index;
      const snippet = content.slice(Math.max(0, idx - 40), Math.min(content.length, idx + 40));

      // If snippet contains a number or objective threshold (e.g. < 200ms, 5 detik, 100%), skip
      const hasMetric = /\d+\s*(?:ms|s|detik|menit|hours|sec|mb|kb|%|\/)/i.test(snippet);
      if (!hasMetric) {
        const suggestion = isId
          ? `Ganti kata '${term}' dengan target angka yang terukur (misal '< 2 detik', '3 klik').`
          : `Replace vague term '${term}' with an objective, measurable threshold (e.g. '< 200ms', '3 clicks').`;

        vagueTerms.push({
          term,
          section: 'Goals & Description',
          suggestion,
        });

        issues.push({
          id: `vague-term-${term.toLowerCase().replace(/\s+/g, '-')}`,
          severity: 'warning',
          section: 'Goals & Description',
          issue: isId
            ? `Istilah '${term}' terlalu ambigu tanpa angka atau tolok ukur objektif.`
            : `Term '${term}' is ambiguous without an objective threshold.`,
          message: isId
            ? `Istilah '${term}' terlalu ambigu tanpa angka atau tolok ukur objektif.`
            : `Term '${term}' is ambiguous without an objective threshold.`,
          fix: suggestion,
        });
        break; // Only report once per vague word to avoid spam
      }
    }
  }

  // 4. Verification Check criteria in Tasks / Blueprint
  if (typeKey === 'prd' || typeKey === 'tasks' || typeKey === 'workflow') {
    const hasChecklist = /-\s*\[\s*[ xX]?\s*\]/m.test(content);
    if (!hasChecklist) {
      const msg = isId
        ? 'Tidak ditemukan kriteria kelulusan dalam format checkbox (- [ ]).'
        : 'No checkable acceptance criteria (- [ ]) found in the document.';
      const fix = isId
        ? 'Tambahkan daftar kriteria selesai menggunakan format `- [ ] <kriteria verifikasi>`.'
        : 'Add verifiable acceptance criteria using `- [ ] <criterion>`.';

      issues.push({
        id: 'no-checkboxes',
        severity: 'blocker',
        section: 'Verification & Slices',
        issue: msg,
        message: msg,
        fix,
      });
    }
  }

  // 5. Non-Goals check for PRDs (anti-scope creep)
  if (typeKey === 'prd') {
    const hasNonGoals = /(?:non-goals?|bukan tujuan|ditunda dulu|yagni)/i.test(content);
    if (!hasNonGoals) {
      const msg = isId
        ? 'Belum ada batasan Non-Goals (fitur yang sengaja ditunda).'
        : 'Explicit Non-Goals section is missing.';
      const fix = isId
        ? 'Sebutkan 1-3 fitur yang ditunda ke versi berikutnya untuk mencegah over-engineering.'
        : 'List 1-3 features explicitly deferred to v2 to prevent scope creep.';

      issues.push({
        id: 'missing-non-goals',
        severity: 'blocker',
        section: 'Scope & Non-Goals',
        issue: msg,
        message: msg,
        fix,
      });
    }
  }

  // 6. Cross-check PRD vs Tasks if context is provided
  if (context.tasksText && typeKey === 'prd') {
    // If PRD mentions authentication or auth, but tasksText does not
    if (/\b(?:auth|authentication|login)\b/i.test(content) && !/\b(?:auth|login)\b/i.test(context.tasksText)) {
      crossChecks.push({
        type: 'scope-without-task',
        item: isId
          ? 'Fitur autentikasi disebut di PRD tetapi belum ada dalam TASKS'
          : 'Authentication was specified in PRD but absent in TASKS',
      });
    }
  }

  const blockerCount = issues.filter((i) => i.severity === 'blocker').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const status: 'ready' | 'needs-work' = blockerCount === 0 ? 'ready' : 'needs-work';

  const summary =
    status === 'ready'
      ? isId
        ? `Rencana dinyatakan SIAP (READY). Ditemukan ${warningCount} catatan kecil non-pemblokir.`
        : `Plan verified as READY. Found ${warningCount} non-blocking recommendations.`
      : isId
        ? `Rencana BUTUH PERBAIKAN (${blockerCount} pemblokir, ${warningCount} peringatan). Perbaiki poin pemblokir sebelum koding.`
        : `Plan NEEDS-WORK (${blockerCount} blocker(s), ${warningCount} warning(s)). Address blockers before writing code.`;

  return createResult<PlanCheckData>({
    tool: 'plan_check',
    verdict: 'verified',
    confidence: 'high',
    data: {
      doc: typeKey,
      type: typeKey,
      status,
      score: {
        required: `${requiredFound}/${requiredCount}`,
        issues: issues.length,
      },
      issues,
      missingSections,
      vagueTerms,
      crossChecks,
      issueCount: issues.length,
      blockerCount,
      warningCount,
      summary,
    },
    evidence: [
      {
        type: 'project-file',
        ref: 'docs/TEMPLATES.md',
        detail: `Executed plan_check rule engine on '${typeKey}' content: status=${status}`,
      },
    ],
    warnings: issues.map((i) => `[${i.severity.toUpperCase()}] ${i.section}: ${i.message || i.issue}`),
  });
}
