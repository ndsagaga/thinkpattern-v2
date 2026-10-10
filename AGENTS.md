# AGENTS.md

Instructions for AI coding agents (Claude Code, Codex, Cursor, etc.) working in this repo. Two people work here in parallel, each with their own agents — keep changes small and easy to merge.

## Project

ThinkPattern v2 is a hackathon project (New Agentic Economy Hackathon, Oct 10 2026). v1 is the existing ThinkPattern mobile app, built for **web** and deployed on Vercel so judges can open it on their phones from a link.

The code is a copy of [perspectives-mobile](https://github.com/ndsagaga/perspectives-mobile) @ `10b5e06` (Expo SDK 54, React Native 0.81, expo-router, TanStack Query, MMKV), with only these web changes:

- `lib/notifications/messaging.web.ts` and `components/fn/NotifPrimingHost.web.tsx`: push notifications are native-only, so they are inert on web.
- `app.json` → `web.output: "single"` (SPA instead of static rendering).
- `npm run build:web` and `vercel.json`. The browser reads the CDN through the `/cdn/*` rewrite to `https://internal.thinkpattern.ai` (the bucket sends no CORS headers).

Ask before choosing new stacks or adding dependencies.

## Run

- `npm install`
- Web dev: `EXPO_PUBLIC_CDN_BASE_URL=https://internal.thinkpattern.ai EXPO_PUBLIC_SEARCH_BASE_URL=https://thinkpattern.ai npx expo start --web` (dev server has no `/cdn` proxy, so point straight at the CDN — may hit CORS).
- Production web build: `npm run build:web` → `dist/`. Vercel builds this on push to `main`.

## Existing code (read-only reference)

Expected as sibling checkouts: `../perspectives-backend`, `../perspectives-mobile`. Treat them as **read-only** from this repo.

**perspectives-backend**: Python batch pipeline (article → event → story; entities are "actors"; "perspectives" are cross-story columns). Publishes a static JSON contract (`docs/serve_contract.md`) to the CDN that this app reads. No user accounts. Never run its `serve` phase against prod from a laptop: it writes salience, takes prod's lock, and moves prod's watermark.

## App conventions (from perspectives-mobile)

- **Rendered navigation → `<Link>`** (with `asChild` around a custom `Pressable`). Imperative `router` only where there is no render context (`NotificationBridge`, `FNNav` → `router.back()`).
- Avoid `dismissTo` on `[id]` routes (it matches by route name and mutates a lower entry's params).
- Never use raw hex or size values in components. Use `colors`, `spacing` and `fontSize` from `constants/`.
- Platform-specific code goes in `*.web.ts(x)` siblings, not `Platform.OS` branches.

## Rules

- Never commit secrets. Gitignored key files from the mobile repo (service-account JSON, `.p8`, `google-services.json`, `GoogleService-Info.plist`) and `eas.json` must never be copied here.
- Work on a feature branch; small, focused commits; don't force-push or push to `main` without the human's OK.
- When a decision is made, add it under **Decisions** in one line.

## Decisions

- v1 = the existing app, unchanged, on web via Vercel. Gemini and Supabase additions come after v1 is live.
- Backend changes (threads/grouping) are out of scope for the hackathon.
