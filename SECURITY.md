# Security Policy — Denvora Groundwork MCP

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Privacy & Security Guarantees

Denvora Groundwork is built with a zero-trust, deterministic security architecture:

1. **Zero External LLM Calls & Zero API Keys:** The server runs completely offline and locally, making zero calls to external LLMs.
2. **Secret & Privacy Shield:**
   - **Absolute Blacklist:** Groundwork strictly rejects any attempt to read, inspect, or traverse into `.env`, `.env.*`, `credentials.json`, `client_secrets.json`, `.npmrc`, `.git-credentials`, `id_rsa`, `.pem`, `.key`, or any sensitive system directories (`.ssh`, `.aws`, `.gnupg`).
   - **Auto-Redaction:** Any credentials, secret keys (OpenAI, Stripe, GitHub, AWS, Bearer tokens), or passwords detected in plan documents or arguments are automatically masked as `[REDACTED_SECRET]`.
   - **No Environment Dumps:** The server never exports or dumps `process.env`.
3. **No Code Execution:** Static analysis only via the TypeScript Compiler API. Groundwork never executes `npm install`, runs package scripts, or imports/requires untrusted downloaded code.
4. **Host Allowlist:** Outbound network connections are strictly restricted to `registry.npmjs.org` and `api.osv.dev` over HTTPS. All other hosts and redirects are rejected immediately.
5. **Sandboxed Decompression:** Tarballs are inspected for size bombs, directory traversals (`..`), and absolute symlinks before extracting only `.d.ts` declaration files into isolated temp directories.

## Reporting a Vulnerability

If you discover a security issue or vulnerability in Denvora Groundwork, please do not open a public issue.

Please report vulnerabilities privately to the maintainer:
- **Maintainer:** Arden Pratama Maskuri
- **Email:** [ardenpratamam2008@gmail.com](mailto:ardenpratamam2008@gmail.com)
- **GitHub:** [@ardenpratamamaskuri404](https://github.com/ardenpratamamaskuri404)

We will respond promptly and coordinate a security patch.
