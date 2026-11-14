# Contributing to Denvora Groundwork MCP

Thank you for your interest in contributing to **Denvora Groundwork**! Groundwork is a deterministic verification and planning MCP server for AI coding assistants.

## Philosophy

1. **Honesty over coverage:** Never guess. Return `unverifiable` with a reason when data cannot be proven.
2. **Never execute untrusted package code:** No `npm install`, no `require()`, no post-install hooks. AST and static analysis only.
3. **Secret & Privacy Shield:** Never inspect, leak, or log `.env` files or credentials. Auto-redact secrets.
4. **Stable public contract:** Any tool schema change must follow `docs/TOOLS.md` and bump the schema version.

## Development Setup

```bash
# Clone the repository
git clone https://github.com/ardenpratamamaskuri404/denvora-groundwork-mcp.git
cd denvora-groundwork-mcp

# Install dependencies
npm install

# Compile TypeScript
npm run build

# Run unit tests
npm test
```

## Making Changes

1. Fork or branch from `main`.
2. Keep slices atomic: implement one tool or rule at a time with tests.
3. Ensure strict TypeScript compilation (`npm run build`) and test suite (`npm test`) pass with 0 errors.
4. Submit a Pull Request describing: what was added, what was tested, and evidence of deterministic behavior.

## Questions & Feedback

Open an issue at [https://github.com/ardenpratamamaskuri404/denvora-groundwork-mcp/issues](https://github.com/ardenpratamamaskuri404/denvora-groundwork-mcp/issues).
