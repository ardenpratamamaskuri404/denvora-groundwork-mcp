import { describe, it, expect } from 'vitest';
import { createGroundworkServer } from '../../src/server.js';

describe('Server Initialization and Tool Registration (src/server.ts)', () => {
  it('creates an McpServer instance with all 10 expected tools registered', () => {
    const server = createGroundworkServer() as any;
    expect(server).toBeDefined();
    expect(server.server).toBeDefined();

    const registeredToolNames = Object.keys(server._registeredTools);

    const expectedTools = [
      'groundwork_status',
      'verify_package',
      'verify_symbol',
      'suggest_symbol',
      'scan_vulnerabilities',
      'verify_installed',
      'plan_brainstorm',
      'plan_template',
      'plan_check',
      'plan_next_slice',
    ];

    for (const expected of expectedTools) {
      expect(registeredToolNames).toContain(expected);
    }

    expect(registeredToolNames.length).toBe(10);
  });
});
