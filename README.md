<div align="center">

<p align="center">
  <img src="assets/denvora-logo-mcp.png" alt="Denvora Groundwork MCP" width="640" />
</p>

**Ground your AI before it builds.**  
*Deterministic verification and spec-driven planning MCP server for AI coding assistants.*

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![MCP Protocol](https://img.shields.io/badge/MCP-stdio%20(JSON--RPC%202.0)-purple.svg)](https://modelcontextprotocol.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3%20(Strict)-3178C6.svg)](tsconfig.json)
[![Security Shield](https://img.shields.io/badge/Secret%20Shield-Active-success.svg)](SECURITY.md)

</div>

---

## 💡 Why Groundwork?

AI coding assistants sound convincing even when they are guessing. They hallucinate nonexistent npm methods, use deprecated parameters, start coding before understanding user constraints, and risk exposing sensitive credentials.

**Denvora Groundwork** is an open-source [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that equips AI assistants with deterministic ground truth:

1. **Verify (Facts over Hallucinations):** True static AST analysis on `.d.ts` declaration files, live npm registry metadata, typosquatting alarms, and OSV vulnerability scanning. Verdicts are strictly three-state: `verified`, `not_found`, or `unverifiable` — **never a guess**.
2. **Plan (Spec-Driven Development):** Bilingual (Indonesian & English) brainstorming frameworks, PRD Blueprint templates, plan completeness checks, and atomic slice task ordering.
3. **Secret & Privacy Shield:** Absolute protection for user privacy. Rejects queries targeting `.env`, credentials, SSH/AWS keys, and automatically redacts API keys into `[REDACTED_SECRET]`.
4. **Zero API Keys & Zero LLM Calls:** Operates 100% deterministically and locally via stdio.

---

## 🏛️ System Architecture

<p align="center">
  <img src="assets/denvora-groundwork-architecture.png" alt="Denvora Groundwork MCP Architecture: AI Assistant Clients, Local Stdio Protocol, Dual-Engine Core, and Evidence-Backed Verdicts" width="100%">
