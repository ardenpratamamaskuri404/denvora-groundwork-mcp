import { describe, it, expect } from 'vitest';
import { handlePlanBrainstorm } from '../../../src/tools/plan-brainstorm.js';
import { handlePlanTemplate } from '../../../src/tools/plan-template.js';
import { handlePlanCheck } from '../../../src/tools/plan-check.js';
import { handlePlanNextSlice } from '../../../src/tools/plan-next-slice.js';

describe('Plan Module Tools', () => {
  describe('plan_brainstorm', () => {
    it('returns at most 3 clarifying questions for explore stage', async () => {
      const res = await handlePlanBrainstorm({
        idea: 'A minimalist expense tracker CLI',
        stage: 'explore',
        language: 'en',
      });

      expect(res.verdict).toBe('verified');
      expect(res.data.blockingQuestions.length).toBeLessThanOrEqual(3);
      expect(res.data.blockingQuestions.length).toBeGreaterThan(0);
      expect(res.data.frameworks.length).toBeGreaterThan(0);
      expect(res.data.nextStep).toContain('PRD');
    });

    it('skips questions already covered in known dictionary', async () => {
      const res = await handlePlanBrainstorm({
        idea: 'An invoice maker for freelancers',
        stage: 'explore',
        known: {
          audience: 'freelancers who need quick PDF invoices',
        },
        language: 'en',
      });

      // q_target checks audience, so it should be skipped
      const hasAudienceQuestion = res.data.blockingQuestions.some((q) => q.id === 'q_target');
      expect(hasAudienceQuestion).toBe(false);
    });

    it('supports Indonesian language outputs', async () => {
      const res = await handlePlanBrainstorm({
        idea: 'Aplikasi pencatat pengeluaran',
        stage: 'scope',
        language: 'id',
      });

      expect(res.verdict).toBe('verified');
      expect(res.data.nextStep).toContain('plan_template');
      expect(res.data.frameworks[0].name).toContain('MoSCoW');
    });
  });

  describe('plan_template', () => {
    it('generates standard PRD lite template matching prd-blueprint.md', async () => {
      const res = await handlePlanTemplate({
        doc: 'prd',
        level: 'lite',
        language: 'en',
        projectName: 'Denvora CLI',
      });

      expect(res.verdict).toBe('verified');
      expect(res.data.doc).toBe('prd');
      expect(res.data.sections.length).toBeGreaterThanOrEqual(5);
      expect(res.data.markdownSkeleton).toContain('# PRD Blueprint: Denvora CLI');
      expect(res.data.markdownSkeleton).toContain('Overview & Problem Statement');
      expect(res.data.markdownSkeleton).toContain('Scope & Explicit Non-Goals');
    });

    it('generates Indonesian full template', async () => {
      const res = await handlePlanTemplate({
        type: 'prd',
        level: 'full',
        language: 'id',
        projectName: 'Aplikasi Kasir',
      });

      expect(res.verdict).toBe('verified');
      expect(res.data.language).toBe('id');
      expect(res.data.markdownSkeleton).toContain('Ringkasan & Masalah');
      expect(res.data.markdownSkeleton).toContain('Risiko & Antisipasi Kegagalan');
    });

    it('returns unverifiable for unknown template type', async () => {
      const res = await handlePlanTemplate({
        doc: 'unknown-template-type-xyz',
      });

      expect(res.verdict).toBe('unverifiable');
      expect(res.reason).toBe('invalid_input');
    });
  });

  describe('plan_check', () => {
    it('detects missing non-goals and missing sections in incomplete PRD', async () => {
      const incompletePrd = `
# Incomplete PRD
Here is a vague plan to make a fast app that is simple and easy.
      `;

      const res = await handlePlanCheck({
        doc: 'prd',
        text: incompletePrd,
        language: 'en',
      });

      expect(res.data.status).toBe('needs-work');
      expect(res.data.blockerCount).toBeGreaterThan(0);
      expect(res.data.issues.some((i) => i.id === 'missing-non-goals')).toBe(true);
      expect(res.data.vagueTerms.length).toBeGreaterThan(0);
    });

    it('detects secret leaks in plan documents', async () => {
      const mockKey = ['sk', '_test_', 'dummyfaketoken1234567890abcdef'].join('');
      const leakingPlan = `
# Deployment Plan
We will use api key ${mockKey} to deploy.
- [ ] Deploy server
Non-Goals:
- No billing in v1
      `;

      const res = await handlePlanCheck({
        doc: 'tasks',
        text: leakingPlan,
        language: 'en',
      });

      expect(res.data.status).toBe('needs-work');
      expect(res.data.issues.some((i) => i.id === 'secret-shield-leak')).toBe(true);
    });

    it('validates a well-formed PRD as ready', async () => {
      const wellFormedPrd = `
# PRD Blueprint: Task Engine
## 1. Overview & Problem Statement
Solves task planning latency for developers.
## 2. Scope & Explicit Non-Goals
Core task sorting is included. Non-goals: No user auth, no cloud sync in v1.
## 3. Tech Stack & Architecture
Node.js, TypeScript, and SQLite.
## 4. Slice Implementation Plan (Sequential & Independent)
- [ ] T1 Scaffolding and types
- [ ] T2 Storage engine
- [ ] T3 CLI interface
## 5. Verification & Acceptance Criteria
- [ ] All vitest test suites pass with 0 errors
## 6. Assumptions & Defaults
Runs locally on desktop.
      `;

      const res = await handlePlanCheck({
        doc: 'prd',
        text: wellFormedPrd,
        language: 'en',
      });

      expect(res.data.blockerCount).toBe(0);
      expect(res.data.status).toBe('ready');
    });

    it('cross-checks PRD with tasks context', async () => {
      const prd = `
# PRD
Mentions login and auth for users.
Non-goals: None.
- [ ] Build app
      `;
      const tasks = `
- [ ] T1 Build database [verify: db test]
      `;

      const res = await handlePlanCheck({
        doc: 'prd',
        text: prd,
        context: { tasksText: tasks },
      });

      expect(res.data.crossChecks.some((c) => c.type === 'scope-without-task')).toBe(true);
    });
  });

  describe('plan_next_slice', () => {
    it('returns the first unblocked task in dependency chain', async () => {
      const tasksText = `
- [x] T0 Project scaffolding [verify: npm run build passes]
- [ ] T1 Database schema [after: T0] [verify: migration succeeds]
- [ ] T2 API endpoint [after: T1] [verify: curl /api returns 200]
- [ ] T3 UI dashboard [after: T2] [verify: renders widgets]
      `;

      const res = await handlePlanNextSlice({ tasksText });

      expect(res.verdict).toBe('verified');
      expect(res.data.done).toBe(1);
      expect(res.data.total).toBe(4);
      expect(res.data.next).not.toBeNull();
      expect(res.data.next?.id).toBe('T1');
      expect(res.data.next?.verify).toContain('migration succeeds');
      expect(res.data.blocked.length).toBe(2); // T2 and T3 are blocked
      expect(res.data.blocked[0].id).toBe('T2');
      expect(res.data.blocked[0].waitingOn).toContain('T1');
    });

    it('filters next task by focus tag when requested', async () => {
      const tasksText = `
- [ ] T1 Backend auth [focus: backend] [verify: auth test passes]
- [ ] T2 Frontend banner [focus: frontend] [verify: renders on desktop]
      `;

      const res = await handlePlanNextSlice({
        tasksText,
        focus: 'frontend',
      });

      expect(res.verdict).toBe('verified');
      expect(res.data.next?.id).toBe('T2');
    });

    it('detects completion when all tasks are marked done', async () => {
      const tasksText = `
- [x] T1 Scaffolding
- [x] T2 Implementation
- [x] T3 Verification
      `;

      const res = await handlePlanNextSlice({ tasksText });

      expect(res.verdict).toBe('verified');
      expect(res.data.done).toBe(3);
      expect(res.data.total).toBe(3);
      expect(res.data.next).toBeNull();
      expect(res.data.blocked.length).toBe(0);
    });

    it('detects dependency deadlock / circular dependency', async () => {
      const deadlockTasks = `
- [ ] T1 Feature A [after: T2] [verify: a works]
- [ ] T2 Feature B [after: T1] [verify: b works]
      `;

      const res = await handlePlanNextSlice({ tasksText: deadlockTasks });

      expect(res.verdict).toBe('verified');
      expect(res.data.next).toBeNull();
      expect(res.data.blocked.length).toBe(2);
      expect(res.data.warnings.some((w) => w.includes('deadlock') || w.includes('circular'))).toBe(true);
    });
  });
});
