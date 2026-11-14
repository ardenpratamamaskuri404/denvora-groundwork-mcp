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
</p>

---

## 🛠️ The 10 Public Tools

All tools conform to the stable public schema `groundwork/1`.

### 🔍 Verify Module (npm / TypeScript AST Engine)

| Tool | What It Does | Verdicts / Evidence |
|---|---|---|
| `verify_package` | Checks if an npm package exists, detects typosquat lookalike names, verifies version publication, and inspects TypeScript declaration types (`bundled`, `definitelytyped`, `none`). | `verified`, `not_found`, `unverifiable` |
| `verify_symbol` | Downloads package tarball into an isolated memory sandbox, extracts `.d.ts` declarations, and runs TypeScript compiler AST analysis (`ts.createProgram`) to prove whether an exported function, class, or type actually exists. | `verified`, `not_found`, `unverifiable` |
| `suggest_symbol` | Uses Levenshtein distance ranking to recommend the closest real exported symbol names when an AI or developer mistypes an API. | Nearest ranked symbol exports |
| `scan_vulnerabilities` | Queries the live Open Source Vulnerabilities database (`api.osv.dev`) for CVEs, GHSA advisories, and severity ratings for exact package versions. | Advisory list & CVE IDs |
| `verify_installed` | Inspects local `node_modules` without internet access. Enforces path confinement and strictly rejects attempts to read `.env` or sensitive project files. | Local package version & export AST |

### 📋 Plan Module (Spec-Driven Development Engine)

| Tool | What It Does | Outputs |
|---|---|---|
| `plan_brainstorm` | Generates at most 3 focused clarifying questions, scope reduction frameworks (MoSCoW, Smallest Lovable v1), and defaults. Automatically skips questions if user context is already known. Bilingual (EN/ID). | `blockingQuestions`, `frameworks`, `nextStep` |
| `plan_template` | Generates structured SDD skeletons (`prd`, `brief`, `tasks`, `workflow`, `decisions`) harmonized with [`denvora-ai-skills`](https://github.com/ardenpratamamaskuri404/denvora-ai-skills) `prd-blueprint.md`. | Bilingual sections & markdown skeleton |
| `plan_check` | Quality gate for project plans: checks for missing sections, detects ambiguous words (*"fast"*, *"easy"*, *"bagus"*) lacking measurable metrics, verifies non-goals, and flags leaked API keys. | `ready` vs `needs-work` with blocker list |
| `plan_next_slice` | Parses markdown task lists with checkboxes (`- [ ]`), dependencies (`[after: T1]`), and verification steps (`[verify: npm test]`), returning the next unblocked actionable task. | Next task, blocked tasks, deadlock detection |

### ⚡ Core Status Tool

- `groundwork_status`: Reports runtime invariants, active security shield boundaries, and transport health over stdio.

---

## 🛡️ Secret & Privacy Shield

User security and confidentiality are top priorities. Denvora Groundwork enforces hard technical boundaries:

- **Strict File Blacklist:** The server strictly rejects queries targeting sensitive files:
  - `.env`, `.env.*`, `.env.local`, `.env.production`
  - `credentials.json`, `client_secrets.json`, `service-account*.json`
  - `.npmrc`, `.git-credentials`, `.netrc`
  - `id_rsa`, `id_ed25519`, `*.pem`, `*.key`, `*.keystore`, `*.pfx`, `*.p12`
  - Sensitive directories: `~/.ssh`, `~/.aws`, `~/.gnupg`
- **Path Traversal Protection:** Input package names are strictly validated (`isValidPackageName`); path traversals like `../../.env` are immediately blocked.
- **Credential Auto-Redaction:** Any API keys (`sk-...`, `ghp_...`, `AKIA...`, Bearer tokens) or passwords in plan documents or arguments are automatically replaced with `[REDACTED_SECRET]`.
- **Zero Code Execution:** Groundwork never runs `npm install`, post-install hooks, or `require()` on downloaded tarballs.
- **Host Allowlist:** HTTPS network requests are restricted exclusively to `registry.npmjs.org` and `api.osv.dev`.

See [`SECURITY.md`](SECURITY.md) for our complete security policy and reporting guidelines.

---

## 🚀 Quickstart & Installation

Groundwork runs locally on your machine over standard `stdio` transport. You can install and run it using either **Plan A (Global Instant)** or **Plan B (Local Clone)**:

### 📦 Choose Your Installation Plan

| Method | Best For | Prerequisites | Command |
|---|---|---|---|
| **Plan A: Global Instant** | Quickest setup, zero manual cloning | Node.js (>= 18) | `npx -y denvora-groundwork`<br/>*or* `npx github:ardenpratamamaskuri404/denvora-groundwork-mcp` |
| **Plan B: Local Clone** | Offline use, custom modification, auditing | Git + Node.js (>= 18) | `node <path-to-repo>/dist/index.js` |

---

### Configuration by Client

#### 1. Antigravity IDE & CLI

Open **MCP Servers** in Antigravity → **Manage MCP Servers** → **View raw config** (`mcp_config.json`):

**Plan A (Global via NPX):**
```json
{
  "mcpServers": {
    "denvora-groundwork": {
      "command": "npx",
      "args": ["-y", "denvora-groundwork"]
    }
  }
}
```

**Plan B (Local Clone):**
```json
{
  "mcpServers": {
    "denvora-groundwork": {
      "command": "node",
      "args": ["/path/to/denvora-groundwork-mcp/dist/index.js"]
    }
  }
}
```

#### 2. Claude Desktop & Claude Code

Edit `%APPDATA%\Claude\claude_desktop_config.json` (Windows) or `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

**Plan A (Global via NPX):**
```json
{
  "mcpServers": {
    "denvora-groundwork": {
      "command": "npx",
      "args": ["-y", "denvora-groundwork"]
    }
  }
}
```

**Plan B (Local Clone):**
```json
{
  "mcpServers": {
    "denvora-groundwork": {
      "command": "node",
      "args": ["/absolute/path/to/denvora-groundwork-mcp/dist/index.js"]
    }
  }
}
```

#### 3. Cursor & VS Code

In Cursor Settings → **Features** → **MCP** → **Add New MCP Server**:
- **Name:** `denvora-groundwork`
- **Type:** `command`
- **Plan A Command:** `npx -y denvora-groundwork`
- **Plan B Command:** `node /absolute/path/to/denvora-groundwork-mcp/dist/index.js`

#### 4. Kiro IDE

Add to `.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "denvora-groundwork": {
      "command": "npx",
      "args": ["-y", "denvora-groundwork"]
    }
  }
}
```

---

## 🤝 Synergy with `denvora-ai-skills`

Denvora Groundwork is designed as the native deterministic engine for [`denvora-ai-skills`](https://github.com/ardenpratamamaskuri404/denvora-ai-skills):

- **Skill:** Governs *how* the AI interacts with you (bilingual empathy, mode router, brainstorming questions, and interactive approval).
- **Groundwork MCP:** Provides the *objective facts* (AST export checking, CVE audits, PRD quality gate scoring, and unblocked task resolution).

Both can be used together for the ultimate Spec-Driven Development (SDD) experience, or standalone.

---

## 🧪 Development & Verification

```bash
# Clone the repository
git clone https://github.com/ardenpratamamaskuri404/denvora-groundwork-mcp.git
cd denvora-groundwork-mcp

# Install dependencies
npm install

# Compile strict TypeScript
npm run build

# Run unit tests (47 tests across 9 suites)
npm test

# Run end-to-end stdio JSON-RPC client check
node scratch/test_mcp_client.mjs
```

---

## Panduan Penggunaan & Instalasi (Bahasa Indonesia)

Selamat datang di **Denvora Groundwork MCP**! Server MCP ini dibuat khusus untuk memverifikasi kebenaran kode secara deterministik dan menyusun rencana spesifikasi teknis (Spec-Driven Development) sebelum AI mulai menulis kode program.

### ❓ Mengapa AI Coding Membutuhkan Denvora Groundwork?

Ketika berinteraksi dengan AI Coding Assistant (seperti Antigravity, Claude, Cursor, atau Kiro), sering kali AI:
- **Halusinasi Nama Fungsi/API:** Menyebutkan fungsi atau method package yang sebenarnya tidak pernah ada di library npm.
- **Mengabaikan Versi:** Menggunakan sintaks lawas atau parameter yang sudah di-*deprecate*.
- **Typosquatting:** Menggunakan nama package yang mirip dengan aslinya (misalnya `axio` alih-alih `axios`).
- **Langsung Ngoding Tanpa Rencana:** Membuat kode acak-acakan tanpa arsitektur, batasan non-goals, atau tahapan kerja yang jelas.
- **Risiko Privasi:** Berpotensi membaca atau memaparkan file rahasia seperti `.env`, kredensial basis data, atau API key.

**Denvora Groundwork MCP** memecahkan masalah ini dengan menyediakan 10 alat deterministik yang berjalan langsung di komputer Anda melalui protokol standar `stdio`, **tanpa biaya API key tambahan** dan **tanpa panggilan LLM eksternal**.

---

### 🌟 Fitur Utama Denvora Groundwork

1. **Modul Verifikasi (Verify):**
   - **AST Declaration Analysis:** Mengunduh dan membaca file deklarasi `.d.ts` dari npm secara statis menggunakan TypeScript Compiler API. Verdict yang dihasilkan selalu 3 nilai pasti: `verified`, `not_found`, atau `unverifiable` (**bukan tebakan AI**).
   - **Pencegahan Typosquatting:** Memeriksa jarak Levenshtein terhadap library populer di npm untuk mencegah serangan malicious package.
   - **Audit Kerentanan (CVE):** Terhubung langsung ke basis data terbuka OSV (`api.osv.dev`) untuk mendeteksi celah keamanan versi package.
   - **Saran Nama Symbol (`suggest_symbol`):** Memberikan rekomendasi nama export yang benar jika pengembang atau AI salah mengingat nama fungsi.

2. **Modul Rencana (Plan):**
   - **Brainstorming Terarah:** Menghasilkan maksimal 3 pertanyaan penjelas krusial dan kerangka prioritas (MoSCoW / Smallest Lovable v1).
   - **Template Spesifikasi Bilingual:** Kerangka siap pakai untuk PRD, Brief, Task, dan Workflow dalam Bahasa Indonesia atau Inggris.
   - **Pintu Gerbang Kualitas Rencana (`plan_check`):** Mendeteksi rencana yang belum lengkap, menandai kata-kata ambigu (seperti *"cepat"*, *"mudah"*, *"bagus"* tanpa tolok ukur jelas), dan mencegah API key bocor.
   - **Pelacak Tugas Atomik (`plan_next_slice`):** Memilih tugas berikutnya yang belum terblokir berdasarkan dependensi dan kriteria verifikasi.

3. **Perisai Privasi & Keamanan (Secret & Privacy Shield):**
   - **Blacklist File Rahasia:** Menolak secara ketat setiap query atau pembacaan terhadap file `.env`, `.env.*`, `credentials.json`, `id_rsa`, sertifikat `.pem`, dan folder `~/.ssh` / `~/.aws`.
   - **Sensor Otomatis (Redaction):** Mengubah otomatis semua string API key (`sk-...`, `ghp_...`, token bearer) menjadi teks aman `[REDACTED_SECRET]`.
   - **Isolasi Sandbox & Tanpa Eksekusi:** Tidak pernah menjalankan skrip instalasi npm atau `require()` terhadap kode luar.
