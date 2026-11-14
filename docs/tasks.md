# Lightning Vend — Task List

Phased. Each task is independently testable. Run `npm test` after each phase.

## Phase 0 — Spec & scaffold
- [x] Research CryptoVend protocol; confirm assumptions
- [x] Write requirements.md, design.md, tasks.md
- [ ] `git init`, `.gitignore`, initial commit of legacy code
- [ ] Monorepo: root `package.json` (workspaces), `tsconfig.base.json` (strict), ESLint flat config, Prettier, Vitest base config
- [ ] `/shared`: types, zod schemas, constants, config schema + validation

## Phase 1 — Core server: state machine, persistence, adapters
- [ ] `/server`: config loader (env + settings), pino logger, graceful shutdown
- [ ] SQLite repository layer: orders, machine_credits, audit_log, settings, webhook_seen, admin_sessions + migrations
- [ ] Order state machine (allow-list, audit on transition) + unit tests
- [ ] Payment provider interface + Mock + OpenNode + LNbits/BTCPay stubs + unit tests
- [ ] Machine adapter interface + MockMachine + CryptoVend + unit tests
- [ ] Credit worker: idempotent claim/act/record + exponential backoff + unit tests
- [ ] fast-check property tests for credit invariants

## Phase 2 — API, reliability, real-time
- [ ] Fastify app + plugins (helmet, cors, rate-limit, cookie, csrf, body limits)
- [ ] Public routes: config, orders create/get, SSE events, webhook (HMAC + replay), /health /ready
- [ ] SSE manager; polling fallback verified via kiosk contract
- [ ] Pending-order recovery on startup; stale-claim re-claim
- [ ] Integration tests (full flow, Mock provider + MockMachine)

## Phase 3 — Security & admin
- [ ] Admin auth: bcrypt hash, session cookie, CSRF, `requireAdmin` hook
- [ ] Audit logging wired into state transitions + admin actions
- [ ] Admin API: metrics, orders (filter/search/pagination), CSV export, retry-credit, machine health, test-credit, settings, audit
- [ ] Alert dispatcher stub (email/webhook) on offline/credit-fail
- [ ] Integration tests for admin auth + CSRF + endpoints

## Phase 4 — Kiosk UI
- [ ] Vue 3 + TS + Vite scaffold; design system (tokens, components, touch targets)
- [ ] States: idle, invoice (QR + copy), waiting (countdown), paid, expired, error, offline, out-of-service
- [ ] i18n EN/Urdu(RTL)/ES + language switcher on idle
- [ ] Fiat + sats + exchange-rate note; auto-reset; offline-first; PWA; reduced-motion
- [ ] SSE + polling fallback client

## Phase 5 — Admin UI
- [ ] Vue 3 + TS + Vite scaffold; login page
- [ ] Dashboard metrics; orders table (filters/search/CSV); machine health + test credit; settings; audit log; alerts config

## Phase 6 — E2E, DevOps, docs
- [ ] Playwright E2E: idle → invoice → mock paid → confirmation → reset
- [ ] Dockerfile (multi-stage) + docker-compose; `.env.example` expanded
- [ ] GitHub Actions: lint, typecheck, test, build, audit; coverage threshold
- [ ] README (Mermaid diagram, mock/testnet/live setup, wiring, troubleshooting, verified vs not)
- [ ] MIT license, CONTRIBUTING.md, CHANGELOG.md

## Phase 7 — Demo & limitations
- [ ] 3-minute demo script (`docs/demo.md`)
- [ ] Known limitations list (`docs/limitations.md`)
- [ ] Final green CI run
