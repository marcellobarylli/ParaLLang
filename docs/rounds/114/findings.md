# Round 114 findings

## Question
Can the web client be served from GitHub Pages, phone-friendly, against a hosted server that calls Claude through
the owner's subscription?

## Finding
The setup is in place and tested locally. Pages, Docker and Render have not run, because none of them can run from
the cluster. They are checked by review until the owner's first deploy.

## Method
A build agent worked from the frozen design and the scope Amendment. Tests and the client build ran in Slurm jobs
5386 and 5387 (CPU, node dada). The production token check and the Dockerfile's install step were smoke-tested on the
login node without opening a port.

## Results
- Server: 416 of 416 tests pass (job 5387), including `server/test/dungeon.test.js` and a web-client contract test:
  the token from settings reaches a protected server, and a wrong token is refused.
- Client: 29 of 29 pass (21 before), including `settings.test.js`, `pages.test.js` and `settings-sheet.test.jsx`.
- Mobile: 320 of 320 pass; `mobile/` is unchanged.
- Client build: relative asset paths, `version.json` and icons in `dist`, the server URL inlined.
- `NODE_ENV=production` with no token or a short token: the server exits with code 1 before listening.
- A CLI provider now binds `0.0.0.0` only in production with a token. Before this it bound 127.0.0.1 only, which
  would have made the container unreachable on Render.

## Decision
Ship the infrastructure. Keep the committed dungeon server code for the next round, and keep the rest of the level
work in `trail/level-wip.patch`. The patch's early `settings.js` and `encounter.js` are superseded and should be
skipped when it is applied.

## Evidence
[`architecture.md`](architecture.md) (Design, Amendment, Outcome), [`trail/journal.md`](trail/journal.md),
[`trail/interview.md`](trail/interview.md), [`trail/level-wip.patch`](trail/level-wip.patch).

## Claim boundary
Nothing has been deployed. GitHub Actions on Node 22, the Docker image, the Claude CLI inside it and Render's
health check are unverified. Nobody has played against the hosted server.

## Open items
- Owner steps: make the repo public and set Pages to "GitHub Actions"; create the Render blueprint with
  `CLAUDE_CODE_OAUTH_TOKEN` and `PARALLANG_TOKEN`; set the repository variable `VITE_API_BASE` to the Render URL;
  enter the token once in the app's settings.
- The free Render plan sleeps when idle and loses saves on redeploy; a paid disk at `/data` keeps them.
- The next round builds the dungeon: the camera director, the 3D view, aesthetic in the workspaces, screenshots of
  the camera states. It starts from this round's Design and `trail/level-wip.patch`.
