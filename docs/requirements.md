# Lightning Vend — Requirements

Traceable to the product brief. Each requirement has an ID (`FR` functional, `NFR` non-functional, `SEC` security, `OPS` ops) and an acceptance test where applicable.

## 1. Product goal
A reliable, secure, beautiful Lightning payment kiosk for vending machines, with an operator dashboard. Customers pay in under 30 seconds; operators can trust the numbers.

- `FR-0` A customer can complete a purchase: tap start → scan Lightning invoice → pay → machine credits → confirmation. (E2E test)
- `NFR-0` Median time-to-pay (tap → paid) under 30 s on a healthy network.

## 2. Architecture
- `FR-1` TypeScript everywhere, strict mode.
- `FR-2` Monorepo with workspaces: `/server`, `/kiosk`, `/admin`, `/shared` (types + zod schemas).
- `FR-3` Server: Fastify + zod request validation; SQLite via `better-sqlite3` behind a repository layer.
- `FR-4` Order state machine with illegal transitions impossible and logged. States: `created → pending → paid → crediting → credited → completed`, plus `expired`, `failed`, `credit_failed`, `refunded_needed`.
- `FR-5` Payment-provider adapter interface with Mock, OpenNode, and an LNbits/BTCPay stub. Provider selected by config, never hard-coded.
- `FR-6` Machine adapter interface `credit()/status()/ping()` with MockMachine and CryptoVend adapter. CryptoVend implements only what is verified from the upstream repo; anything unverified is marked in the README.
- `FR-7` Idempotency: a paid order credits the machine exactly once despite webhook retries, polling, and restarts. DB unique constraint + transaction. (Property test)
- `FR-8` Retry machine credit with exponential backoff; after N tries, mark `credit_failed` and surface on the admin dashboard.
- `FR-9` Real-time kiosk updates via SSE with polling fallback.

## 3. Security
- `SEC-1` API keys only in env, validated at startup, never sent to the browser.
- `SEC-2` Verify OpenNode webhook HMAC with timing-safe compare; reject replays.
- `SEC-3` Rate limiting, helmet headers, strict CORS, request size limits.
- `SEC-4` Admin dashboard behind login: hashed password, httpOnly session cookie, CSRF protection.
- `SEC-5` Audit log for every state change and every admin action.
- `SEC-6` Dependency audit step in CI.

## 4. Kiosk UI (tablet, landscape + portrait)
- `FR-10` Large touch targets (min 64px), readable from 1 m, high contrast, WCAG AA.
- `FR-11` States: idle attract, product/price confirm, invoice (QR + copy), waiting (live countdown), paid, expired, error, offline, machine-out-of-service.
- `FR-12` Multi-language: English, Urdu (RTL), Spanish; switchable from the idle screen.
- `FR-13` Price in fiat and sats with a live exchange-rate note.
- `FR-14` Auto-reset after inactivity; never leave a stale QR on screen.
- `FR-15` Offline-first: clear message on network drop; automatic recovery.
- `FR-16` Respect `prefers-reduced-motion`; meaningful animation only on payment confirmed.
- `FR-17` PWA/kiosk mode: no text selection, no pinch zoom, no accidental navigation.

## 5. Admin dashboard
- `FR-18` Today/week/month sales, payment success rate, average time-to-pay, failed/expired counts.
- `FR-19` Orders table with filters, search, CSV export.
- `FR-20` Machine health: last heartbeat, credit failures, manual "test credit" button.
- `FR-21` Settings: price, currency, timeouts, language defaults, provider choice (secrets masked).
- `FR-22` Alerts (email or webhook) when the machine is offline or credits fail.

## 6. Reliability and observability
- `OPS-1` Structured logging (pino) with order IDs; `/health` and `/ready` endpoints.
- `OPS-2` Graceful shutdown; recover pending orders on restart by re-checking provider status.
- `OPS-3` Config validation with clear error messages.

## 7. Testing
- `FR-23` Unit tests for the state machine and adapters (Vitest).
- `FR-24` Property-based tests (fast-check): any event sequence (webhook, poll, restart, duplicate delivery, timeout) never credits more than once and never credits an unpaid order.
- `FR-25` Integration tests for the full flow using Mock provider + MockMachine.
- `FR-26` E2E (Playwright): idle → invoice → mock paid → confirmation → reset.
- `FR-27` Coverage threshold enforced in CI.

## 8. DevOps and docs
- `OPS-4` Dockerfile + docker-compose, `.env.example`, GitHub Actions (lint, typecheck, test, build, audit).
- `OPS-5` README with Mermaid architecture diagram, setup for mock/testnet/live, hardware wiring notes, troubleshooting, verified-vs-unverified section.
- `OPS-6` MIT license, `CONTRIBUTING.md`, `CHANGELOG.md`.

## 9. Deliverables
- `OPS-7` Working repo, passing CI, 3-minute demo script, list of known limitations.
