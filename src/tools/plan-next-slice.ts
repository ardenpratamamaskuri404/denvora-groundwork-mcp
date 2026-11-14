/**
 * plan_next_slice tool handler.
 * Parses markdown task lists with checkboxes, dependencies ([after: T1]), and verify steps ([verify: ...]),
 * returning the next unblocked actionable task and dependency state.
 * Harmonized with docs/TOOLS.md and docs/TEMPLATES.md.
 */

import { createResult, createUnverifiable, ResultEnvelope } from '../core/result.js';

export interface PlanNextSliceInput {
  tasksText: string;
  focus?: string;
}

export interface NextTask {
  id: string;
  title: string;
  verify: string;
  dependsOn: string[];
}

export interface BlockedTask {
  id: string;
  title: string;
  waitingOn: string[];
}

export interface PlanNextSliceData {
  next: NextTask | null;
  blocked: BlockedTask[];
  done: number;
  total: number;
  warnings: string[];
}

interface ParsedTask {
  id: string;
  title: string;
  completed: boolean;
  dependsOn: string[];
  verify: string;
  focusTag?: string;
  rawLine: string;
}

export async function handlePlanNextSlice(
  input: PlanNextSliceInput
): Promise<ResultEnvelope<PlanNextSliceData>> {
  const tasksText = input.tasksText ? input.tasksText.trim() : '';
  const focus = input.focus ? input.focus.trim().toLowerCase() : undefined;

  if (!tasksText) {
    return createUnverifiable(
      'plan_next_slice',
      'invalid_input',
      'tasksText must not be empty',
      {
        next: null,
        blocked: [],
        done: 0,
        total: 0,
        warnings: ['tasksText parameter is empty'],
      }
    );
  }

  const lines = tasksText.split(/\r?\n/);
  const tasks: ParsedTask[] = [];
  const warnings: string[] = [];
  const seenIds = new Set<string>();

  // Regular expression to identify markdown checkboxes
  // Matches: - [ ], - [x], * [ ], 1. [ ], etc.
  const checkboxRegex = /^\s*(?:[-*+]|\d+\.)\s*\[([ xX])\]\s*(.*)$/;

  let autoIdCounter = 1;

  for (const line of lines) {
    const match = line.match(checkboxRegex);
    if (!match) continue;

    const checkedChar = match[1];
    const completed = checkedChar === 'x' || checkedChar === 'X';
    let rest = (match[2] ?? '').trim();

    // 1. Extract [after: ...] or [depends: ...]
    const dependsOn: string[] = [];
    const afterMatch = rest.match(/\[(?:after|depends|dependsOn|deps):\s*([^\]]+)\]/i);
    if (afterMatch) {
      const depsRaw = afterMatch[1] ?? '';
      const parts = depsRaw.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
      dependsOn.push(...parts);
      rest = rest.replace(afterMatch[0], '').trim();
    }

    // 2. Extract [verify: ...]
    let verify = '';
    const verifyMatch = rest.match(/\[verify:\s*([^\]]+)\]/i);
    if (verifyMatch) {
      verify = (verifyMatch[1] ?? '').trim();
      rest = rest.replace(verifyMatch[0], '').trim();
    }

    // 3. Extract [focus: ...] or [tag: ...]
    let focusTag: string | undefined;
    const focusMatch = rest.match(/\[(?:focus|tag):\s*([^\]]+)\]/i);
    if (focusMatch) {
      focusTag = (focusMatch[1] ?? '').trim().toLowerCase();
      rest = rest.replace(focusMatch[0], '').trim();
    }

    // 4. Extract task ID
    // Patterns: "T1 ", "T1: ", "[T1] ", "TASK-1 "
    let id = '';
    const bracketIdMatch = rest.match(/^\[([A-Za-z0-9_.-]+)\]\s*(.*)$/);
    if (bracketIdMatch) {
      id = bracketIdMatch[1] ?? '';
      rest = (bracketIdMatch[2] ?? '').trim();
    } else {
      const prefixIdMatch = rest.match(/^([A-Za-z0-9_.-]+)[:.]?\s+(.*)$/);
      if (prefixIdMatch && prefixIdMatch[1] && /^(?:T\d+|TASK-\d+|S\d+|[A-Za-z]\d+)/i.test(prefixIdMatch[1])) {
        id = prefixIdMatch[1];
        rest = (prefixIdMatch[2] ?? '').trim();
      }
    }

    if (!id) {
      id = `T${autoIdCounter++}`;
    }

    if (seenIds.has(id)) {
      warnings.push(`Duplicate task ID '${id}' detected in tasks list.`);
    } else {
      seenIds.add(id);
    }

    tasks.push({
      id,
      title: rest || `Task ${id}`,
      completed,
      dependsOn,
      verify: verify || 'Verification step not specified',
      focusTag,
      rawLine: line,
    });
  }

  if (tasks.length === 0) {
    return createUnverifiable(
      'plan_next_slice',
      'invalid_input',
      'No valid checklist tasks (- [ ] or - [x]) found in tasksText',
      {
        next: null,
        blocked: [],
        done: 0,
        total: 0,
        warnings: ['No markdown checkbox items found (- [ ] or - [x])'],
      }
    );
  }

  const completedIds = new Set(tasks.filter((t) => t.completed).map((t) => t.id));
  const allIds = new Set(tasks.map((t) => t.id));

  // Check for dependencies referencing unknown task IDs
  for (const t of tasks) {
    for (const dep of t.dependsOn) {
      if (!allIds.has(dep)) {
        warnings.push(`Task '${t.id}' depends on unknown task ID '${dep}'.`);
      }
    }
  }

  const unblockedTasks: ParsedTask[] = [];
  const blocked: BlockedTask[] = [];

  for (const t of tasks) {
    if (t.completed) continue;

    const waitingOn = t.dependsOn.filter((dep) => !completedIds.has(dep));
    if (waitingOn.length === 0) {
      unblockedTasks.push(t);
    } else {
      blocked.push({
        id: t.id,
        title: t.title,
        waitingOn,
      });
    }
  }

  const doneCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;

  let next: NextTask | null = null;

  if (unblockedTasks.length > 0) {
    // If focus is specified, try to find an unblocked task matching the focus tag or title
    let selected: ParsedTask | undefined = unblockedTasks[0];
    if (focus) {
      const matchingFocus = unblockedTasks.find(
        (t) =>
          t.focusTag === focus ||
          t.title.toLowerCase().includes(focus) ||
          t.id.toLowerCase().includes(focus)
      );
      if (matchingFocus) {
        selected = matchingFocus;
      }
    }

    if (selected) {
      next = {
        id: selected.id,
        title: selected.title,
        verify: selected.verify,
        dependsOn: selected.dependsOn,
      };
    }
  } else if (doneCount < totalCount) {
    // Incomplete tasks exist, but none are unblocked -> deadlock / cycle
    warnings.push(
      'Dependency deadlock or circular dependency detected: incomplete tasks remain but none are unblocked.'
    );
  }

  return createResult<PlanNextSliceData>({
    tool: 'plan_next_slice',
    verdict: 'verified',
    confidence: 'high',
    data: {
      next,
      blocked,
      done: doneCount,
      total: totalCount,
      warnings,
    },
    evidence: [
      {
        type: 'project-file',
        ref: 'tasksText',
        detail: `Parsed ${totalCount} tasks (${doneCount} completed, ${unblockedTasks.length} unblocked, ${blocked.length} blocked)`,
      },
    ],
    warnings,
  });
}
