# ThinkPattern v2

Hackathon project: new things built **on top of** the existing ThinkPattern product — extensions, a possible new mobile design, and whatever else the plan lands on.

> Status: **exploring.** Direction is not decided yet, so there is intentionally no app scaffolding here. See the planning doc.

- **Planning doc:** https://docs.google.com/document/d/1yFpaSruQ9Bxq0mrSX_mc11xc1HGSeGyrkOKJLODFX0U/edit
- **Existing backend:** [ndsagaga/perspectives-backend](https://github.com/ndsagaga/perspectives-backend) — Python batch pipeline that publishes news stories, actors and perspectives.
- **Existing mobile app:** [ndsagaga/perspectives-mobile](https://github.com/ndsagaga/perspectives-mobile) — Expo / React Native app ("ThinkPattern").

## What we can build on

| Surface | Where |
| --- | --- |
| Static JSON CDN (`manifest.json`, `stories/`, `actors/`, `perspectives/`) | `perspectives-backend/docs/serve_contract.md` |
| Search API `GET https://thinkpattern.ai/api/search` | `perspectives-backend/web/worker` |
| MCP server `POST https://thinkpattern.ai/mcp` (`search_news`, `get_latest_news`) | `perspectives-backend/web/worker` |
| Generated TS types for the contract | `perspectives-mobile/types/contract.gen.ts` |
| Design system and tokens | `perspectives-mobile/design/ThinkPattern/`, `constants/tokens.json` |

## Working here

- Clone the two existing repos next to this one (`../perspectives-backend`, `../perspectives-mobile`) for reference.
- Branch off `main`, keep PRs small, and say in the PR what part of the plan it covers.
- Never commit secrets. Use `.env.local` / `.env` files (gitignored) and add names to a `.env.example`.
- AI agents: read [AGENTS.md](AGENTS.md).
