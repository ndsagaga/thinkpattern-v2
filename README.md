# ThinkPattern v2

ThinkPattern is a news reader that groups the whole press's coverage of an event into one **Story**, profiles the **Actors** involved, and publishes **Perspectives**: columns that connect stories over time.

This repo is our hackathon build of the ThinkPattern app for the web, so anyone can open it on their phone from a link. It reads live data from the production ThinkPattern feed.

## Run locally

```bash
npm install
npm run build:web
```

The output is in `dist/`. Deployed on Vercel (`vercel.json`): `/cdn/*` proxies the public data feed at `internal.thinkpattern.ai`.

## Related repos

- [perspectives-mobile](https://github.com/ndsagaga/perspectives-mobile): the native iOS/Android app this is built from.
- [perspectives-backend](https://github.com/ndsagaga/perspectives-backend): the pipeline that publishes the stories feed.

AI agents: read [AGENTS.md](AGENTS.md).
