/**
 * plan_template tool handler.
 * Generates structured specifications and blueprints.
 * Direct mirror of denvora-ai-skills references/prd-blueprint.md.
 * Harmonized with docs/TOOLS.md and docs/TEMPLATES.md.
 */

import { TEMPLATES_PACK, TemplateDef, TemplateSectionDef } from '../plan/pack.js';
import { createResult, createUnverifiable, ResultEnvelope } from '../core/result.js';

export interface PlanTemplateInput {
  doc?: string;
  type?: string;
  level?: 'lite' | 'full';
  language?: 'en' | 'id';
  projectName?: string;
}

export interface RenderedSection {
  id: string;
  title: string;
  required: boolean;
  purpose: string;
  hint: string;
  example: string;
}

export interface PlanTemplateData {
  doc: string;
  type: string;
  level: 'lite' | 'full';
  language: 'en' | 'id';
  title: string;
  sections: RenderedSection[];
  markdownSkeleton: string;
}

export async function handlePlanTemplate(input: PlanTemplateInput): Promise<ResultEnvelope<PlanTemplateData>> {
  const typeKey = (input.doc || input.type || 'prd').toLowerCase().trim();
  const level = input.level === 'full' ? 'full' : 'lite';
  const language = input.language === 'id' ? 'id' : 'en';
  const isId = language === 'id';
  const projectName = input.projectName ? input.projectName.trim() : isId ? '[Nama Proyek / Fitur]' : '[Project / Feature Name]';

  const templateDef: TemplateDef | undefined = TEMPLATES_PACK[typeKey];

  if (!templateDef) {
    const available = Object.keys(TEMPLATES_PACK).join(', ');
    return createUnverifiable(
      'plan_template',
      'invalid_input',
      `Unknown template type '${input.doc || input.type}'. Available types: ${available}`,
      {
        doc: typeKey,
        type: typeKey,
        level,
        language,
        title: '',
        sections: [],
        markdownSkeleton: '',
      }
    );
  }

  // Filter sections based on level
  const activeSections: TemplateSectionDef[] = templateDef.sections.filter((sec) => {
    if (level === 'lite' && sec.fullOnly) {
      return false;
    }
    return true;
  });

  const renderedSections: RenderedSection[] = activeSections.map((sec) => ({
    id: sec.id,
    title: isId ? sec.titleId : sec.titleEn,
    required: sec.required,
    purpose: isId ? sec.purposeId : sec.purposeEn,
    hint: isId ? sec.hintId : sec.hintEn,
    example: isId ? sec.exampleId : sec.exampleEn,
  }));

  // Build markdown skeleton with structured guidance
  const typeLabel = templateDef.type.toUpperCase();
  const headerTitle = isId ? `# Cetak Biru ${typeLabel}: ${projectName}` : `# ${typeLabel} Blueprint: ${projectName}`;
  const skeletonLines: string[] = [headerTitle, ''];

  renderedSections.forEach((sec, idx) => {
    skeletonLines.push(`## ${idx + 1}. ${sec.title}`);
    skeletonLines.push(`> 💡 *Hint:* ${sec.hint}`);
    skeletonLines.push('');
    skeletonLines.push(sec.example);
    skeletonLines.push('');
  });

  const markdownSkeleton = skeletonLines.join('\n');

  return createResult<PlanTemplateData>({
    tool: 'plan_template',
    verdict: 'verified',
    confidence: 'high',
    data: {
      doc: typeKey,
      type: typeKey,
      level,
      language,
      title: isId ? templateDef.titleId : templateDef.titleEn,
      sections: renderedSections,
      markdownSkeleton,
    },
    evidence: [
      {
        type: 'project-file',
        ref: 'docs/TEMPLATES.md',
        detail: `Generated '${typeKey}' template (${level}, ${language}) with ${renderedSections.length} sections matching SDD blueprint`,
      },
    ],
    warnings: [],
  });
}
