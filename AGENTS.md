# AGENTS.md

Instructions for AI coding agents (Claude Code, Codex, Cursor, etc.) working in this repo. Two people work here in parallel, each with their own agents — keep changes small and easy to merge.

## Project

ThinkPattern v2 is a hackathon project that adds new things on top of the existing ThinkPattern product. The direction is **still being decided** (planning doc linked in [README.md](README.md)).

- **Do not scaffold apps, frameworks, or folder structures** unless the human explicitly asks for it.
- Ask before choosing a stack or adding dependencies.

## Existing code (read-only reference)

Expected as sibling checkouts: `../perspectives-backend`, `../perspectives-mobile`. Treat them as **read-only** from this repo — don't edit them unless the human asks.

**perspectives-backend** — Python 3.11+ batch services (`src/perspectives/<service>`), Postgres + pgvector, Cloudflare R2 / D1, LLMs via litellm. Pipeline: article → event → story; entities are "actors"; "perspectives" (`pp_` ids) are cross-story columns, narrated to MP3. No user accounts.
Public surfaces:
- Static JSON CDN, contract in `docs/serve_contract.md`, schemas in `src/perspectives/serve/schemas.py`.
- Cloudflare Worker (`web/worker`): `GET /api/search`, MCP at `POST https://thinkpattern.ai/mcp`, SSR pages, `llms.txt`.
- Docs: `docs/RUNBOOK.md`, `docs/HISTORY.md`.

**perspectives-mobile** — Expo SDK 54, React Native 0.81, TypeScript, expo-router, TanStack Query, MMKV. Read-only data from the CDN.
- Data layer (UI-independent, reusable): `types/contract.gen.ts`, `lib/config.ts`, `lib/fetch.ts`, `lib/queryClient.ts`, `data/queries.ts`.
- Design system: `design/ThinkPattern/` (source of truth), `constants/tokens.json` → `constants/theme.ts`, primitives in `components/fn/`. No raw hex/size values in components.
- Has its own `CLAUDE.md` with conventions — follow it when deriving code from this repo.
- Docs: `docs/backend_idl_contract.md`, `docs/mobile_eng_handoff.md`.

When deriving from existing code, prefer consuming the public contract (CDN JSON, `/api/search`, MCP) over copying internals. If you copy code, note the source path and commit in the PR.

## Rules

- Never commit secrets. The existing repos contain gitignored key files (service-account JSON, `.p8`, `google-services.json`, `GoogleService-Info.plist`) — never copy them here.
- Work on a feature branch; small, focused commits; don't push to `main` or force-push without the human's OK.
- Keep this file current: when a decision is made (stack, folder layout, who owns what), add it under **Decisions** below in one line.

## Decisions

- _None yet._
