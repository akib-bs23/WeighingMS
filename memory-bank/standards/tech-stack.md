# Tech Stack

## Overview

WeighingMS is built as a single TypeScript full-stack web application: a React + Vite single-page station UI served by a Node.js + NestJS backend that also hosts the training-time Dummy APIs (OrgaTEX, Scale, Scanner, Printer). One language end-to-end keeps API contracts shared and type-checked between the UI and the integration layer.

Approved: 2026-10-29T08:33:21Z (project-init, human validated)
Revised: 2026-10-29 — backend changed from Fastify to NestJS, package manager from npm to pnpm (human decision during data-stack review)

## Languages

**TypeScript** (strict mode) for frontend, backend and tests.

- Shared contract types (batches, recipes, weighings, consumption, tickets) live in one place and are imported by both the UI and the Dummy APIs, so contract drift is a compile error.
- Runtime: Node.js 18+ (development machine currently Node 24) and modern evergreen browsers.

## Framework

**Frontend: React + Vite (SPA)**

- The station is a kiosk-style, state-heavy touch UI (select batch → weigh → confirm & print). No SSR/SSG requirement, so a client-side SPA is the simplest fit.
- Vite provides fast dev server, production build and shares config with Vitest.
- The supplied prototype (`docs/customize-weighing-station.html`, plain HTML + inline JS) is the UX reference; it is re-implemented from the approved specification, not copied.

**Backend: Node.js + NestJS**

- Hosts the WeighingMS application API and the Dummy external-system APIs as separate Nest modules (e.g. `OrgatexModule`, `ScaleModule`, `ScannerModule`, `PrinterModule`), keeping the integration boundary explicit (brief IR-07 adapter isolation).
- Dependency injection lets the application depend on adapter interfaces (ports) with Dummy implementations bound at startup, so a real adapter could replace a Dummy one without touching domain code.
- Request validation via DTOs with `class-validator` / `class-transformer` and a global `ValidationPipe`.
- Uses Nest's default HTTP platform (Express). API tests use `@nestjs/testing` with `supertest`.
- Serves the built UI (static assets) in production mode so the whole product starts with one command.

**Training simulator controls**

- Dummy devices expose training-only control endpoints (e.g. set simulated weight, force a device offline) on the same server. These exist to drive demos and failure-scenario tests and are clearly separated from the conceptual device contracts.

## Authentication

**None (real).** Training-only mock identities.

- Operator and Supervisor identities are represented by a mock badge/PIN mechanism for traceability and supervisor-override flows.
- The exact override/authorisation behaviour is defined during Requirements; no production authentication provider is in scope.

## Infrastructure & Deployment

**Local only.**

- Runs on a developer/trainer laptop with Node.js 18+.
- One command starts the backend (APIs + Dummy integrations) and serves the UI; a dev mode runs Vite and NestJS (watch mode) with hot reload.
- No cloud deployment, containers or CI are required for the lab (may be added later in Operations if requested).

## Package Manager

**pnpm** (v11, installed) — fast, disk-efficient, strict dependency resolution. Workbook `npx` commands may still be used for one-off tools (e.g. `npx specsmd`); project scripts run via `pnpm`.

## Decision Relationships

- TypeScript on both sides → shared contract types between React UI and NestJS Dummy APIs.
- Vite → Vitest (same config/transform pipeline) for unit and API tests; Playwright for end-to-end (workbook Step 29). NestJS relies on decorator metadata, so Vitest needs an SWC transform (`unplugin-swc`) for backend tests — final testing details are fixed in `coding-standards.md`.
- Backend persistence choice (seed JSON + SQLite for recorded transactions/consumption) is confirmed in `data-stack.md`.
- Dummy APIs are training contracts only; they make no claim about the real OrgaTEX/SETEX, scale, scanner or printer interfaces (brief assumptions A-01 et al. remain unresolved).
