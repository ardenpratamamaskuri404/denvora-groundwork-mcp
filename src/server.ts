/**
 * Denvora Groundwork MCP Server.
 * Implements Model Context Protocol over stdio transport.
 * Public contract defined in docs/TOOLS.md (groundwork/1).
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createResult } from './core/result.js';

// Verify Module Handlers
import { handleVerifyPackage } from './tools/verify-package.js';
import { handleVerifySymbol } from './tools/verify-symbol.js';
import { handleSuggestSymbol } from './tools/suggest-symbol.js';
import { handleScanVulnerabilities } from './tools/scan-vulnerabilities.js';
import { handleVerifyInstalled } from './tools/verify-installed.js';

// Plan Module Handlers
import { handlePlanBrainstorm } from './tools/plan-brainstorm.js';
import { handlePlanTemplate } from './tools/plan-template.js';
import { handlePlanCheck } from './tools/plan-check.js';
import { handlePlanNextSlice } from './tools/plan-next-slice.js';

export function createGroundworkServer(): McpServer {
  const server = new McpServer(
    {
      name: 'denvora-groundwork',
      version: '0.1.0',
    },
    {
      instructions:
        'Denvora Groundwork provides deterministic package/symbol verification and structured project planning without LLM calls or API keys. Always consult Groundwork before importing unverified libraries or drafting project specifications.',
    }
  );

  // -------------------------------------------------------------
  // Tool 0: groundwork_status
  // -------------------------------------------------------------
  server.tool(
    'groundwork_status',
    'Get Denvora Groundwork MCP runtime status, active capabilities, and security boundaries.',
    {},
    async () => {
      const result = createResult({
        tool: 'groundwork_status',
        verdict: 'verified',
        confidence: 'high',
        data: {
          server: 'denvora-groundwork',
          version: '0.1.0',
          schema: 'groundwork/1',
          transport: 'stdio (JSON-RPC 2.0)',
          capabilities: {
            verifyModule: 'npm/TypeScript static analysis (Phase 1-3)',
            planModule: 'Spec-Driven Development templates & checks (Phase 4)',
            secretShield: 'active (auto-redaction & blacklisted file rejection)',
          },
          invariants: [
            'Zero external LLM calls',
            'Zero API keys required',
            'Static analysis only — no code execution',
            'Honest three-state verdicts (verified, not_found, unverifiable)',
          ],
        },
        evidence: [
          {
            type: 'project-file',
            ref: 'package.json',
            detail: 'Local stdio execution in strict TypeScript runtime',
          },
        ],
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  // -------------------------------------------------------------
  // Tool 1: verify_package
  // -------------------------------------------------------------
  server.tool(
    'verify_package',
    'Verify if an npm package exists, check deprecation, detect typosquatting lookalikes, and check type declarations.',
    {
      name: z.string().describe('npm package name to verify (e.g. "zod", "@types/node")'),
      version: z.string().optional().describe('specific semver or tag, defaults to latest'),
      ecosystem: z.literal('npm').optional().default('npm').describe('ecosystem identifier (currently npm only)'),
    },
    async ({ name, version, ecosystem }) => {
      const result = await handleVerifyPackage({ name, version, ecosystem });
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // -------------------------------------------------------------
  // Tool 2: verify_symbol
  // -------------------------------------------------------------
  server.tool(
    'verify_symbol',
    'Verify if an export symbol exists in an npm package using TypeScript compiler AST analysis on .d.ts files.',
    {
      package: z.string().describe('npm package name'),
      symbol: z.string().describe('named or default export symbol to verify (e.g. "z", "createApp")'),
      version: z.string().optional().describe('package semver or tag'),
      subpath: z.string().optional().describe('subpath export if checking deep imports'),
    },
    async (args) => {
      const result = await handleVerifySymbol(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // -------------------------------------------------------------
  // Tool 3: suggest_symbol
  // -------------------------------------------------------------
  server.tool(
    'suggest_symbol',
    'Find nearest valid export symbol names in an npm package using Levenshtein distance ranking.',
    {
      package: z.string().describe('npm package name'),
      symbol: z.string().describe('misspelled or alleged symbol name'),
      version: z.string().optional().describe('package semver or tag'),
      limit: z.number().optional().default(5).describe('maximum number of ranked suggestions'),
    },
    async (args) => {
      const result = await handleSuggestSymbol(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // -------------------------------------------------------------
  // Tool 4: scan_vulnerabilities
  // -------------------------------------------------------------
  server.tool(
    'scan_vulnerabilities',
    'Scan an npm package version against the OSV advisory database (api.osv.dev) for CVEs and security advisories.',
    {
      package: z.string().describe('npm package name'),
      version: z.string().describe('exact version to scan'),
      ecosystem: z.literal('npm').optional().default('npm').describe('ecosystem identifier'),
    },
    async (args) => {
      const result = await handleScanVulnerabilities(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // -------------------------------------------------------------
  // Tool 5: verify_installed
  // -------------------------------------------------------------
  server.tool(
    'verify_installed',
    'Inspect a package installed in local node_modules with zero network calls and strict Secret Shield protection.',
    {
      projectRoot: z.string().describe('absolute path to the local project root containing node_modules'),
      package: z.string().describe('installed package name to inspect'),
      symbol: z.string().optional().describe('optional export symbol to verify in installed .d.ts files'),
    },
    async (args) => {
      const result = await handleVerifyInstalled(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // -------------------------------------------------------------
  // Tool 6: plan_brainstorm
  // -------------------------------------------------------------
  server.tool(
    'plan_brainstorm',
    'Generate at most 3 targeted clarifying questions and scope reduction frameworks for shaping ideas into plans.',
    {
      idea: z.string().optional().describe('the user concept or idea in their words'),
      context: z.string().optional().describe('context or idea string'),
      stage: z
        .enum(['explore', 'shape', 'scope', 'validate', 'idea', 'tech', 'tasks'])
        .optional()
        .default('explore')
        .describe('planning stage'),
      known: z.record(z.string(), z.any()).optional().describe('already-known answers to avoid duplicate questions'),
      language: z.enum(['en', 'id']).optional().default('en').describe('output language (en or id)'),
    },
    async (args) => {
      const result = await handlePlanBrainstorm(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // -------------------------------------------------------------
  // Tool 7: plan_template
  // -------------------------------------------------------------
  server.tool(
    'plan_template',
    'Get structured section metadata, hints, and markdown skeletons for SDD documents (prd, brief, tasks, workflow).',
    {
      doc: z.string().optional().describe('template type: "prd" | "brief" | "tasks" | "workflow" | "decisions"'),
      type: z.string().optional().describe('template type alias'),
      level: z.enum(['lite', 'full']).optional().default('lite').describe('specification level'),
      language: z.enum(['en', 'id']).optional().default('en').describe('output language (en or id)'),
      projectName: z.string().optional().describe('name of the project or feature'),
    },
    async (args) => {
      const result = await handlePlanTemplate(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // -------------------------------------------------------------
  // Tool 8: plan_check
  // -------------------------------------------------------------
  server.tool(
    'plan_check',
    'Check a PRD, workflow, or task list for missing sections, vague wording, non-goals, checkboxes, and credentials.',
    {
      doc: z.string().optional().describe('document type being checked (prd, workflow, tasks)'),
      type: z.string().optional().describe('document type alias'),
      text: z.string().optional().describe('markdown content of the document'),
      content: z.string().optional().describe('content alias'),
      context: z.record(z.string(), z.any()).optional().describe('cross-check context e.g. { tasksText: "..." }'),
      language: z.enum(['en', 'id']).optional().default('en').describe('output language'),
    },
    async (args) => {
      const result = await handlePlanCheck(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // -------------------------------------------------------------
  // Tool 9: plan_next_slice
  // -------------------------------------------------------------
  server.tool(
    'plan_next_slice',
    'Parse task lists with dependencies ([after: T1]) and verify steps ([verify: ...]), returning the next unblocked task.',
    {
      tasksText: z.string().describe('markdown task list with checkboxes (- [ ] / - [x])'),
      focus: z.string().optional().describe('optional tag/module filter (e.g. "core", "verify")'),
    },
    async (args) => {
      const result = await handlePlanNextSlice(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  return server;
}
