# Round 145 findings

## Question

Can the save be kept somewhere safer than one browser: as JSON on GitHub that says where the learner is in the
curriculum?

## Finding

Yes, by the server, once the owner gives it a token. With `PARALLANG_GITHUB_TOKEN` and `PARALLANG_GITHUB_REPO` set,
every save is also written to a `saves` branch as one JSON file per learner, beginning with where the learner is in
the curriculum, and a server that has lost its disk reads the learner back from it at their next request. Until the
two settings are entered in Render the hosted server keeps its saves on its disk, as before, with the browser's copy
of round 144 as the only line behind it.

## Method

Tests against a GitHub written in the test file; the server's own entry started with and without the settings. Not
run against GitHub (see the claim boundary).

## Results

| What | Result |
|---|---|
| Tests | server 493 of 493 (485 before the round: eight new in `github-saves.test.js`). The web client, the level and the iPhone app are untouched since round 144's last run (241, 73 and 320) |
| A conversation on the road | one commit after the copy's delay: `save <8 hex> (it): A1, unit 1 of 36 (Hello and goodbye), 1 of 108 lessons, 1 conversations [skip ci]`, on a branch made with one parentless commit |
| The file | `saves/it/<40 hex>.json`: the summary (level, Spellbook size, dungeons, the curriculum's position, totals and 36 units) and the whole save; the learner's id occurs nowhere in it |
| A server with an empty disk | `POST /api/learner` with the old id answers `recovered: true`; the road, the curriculum and the level are as they were |
| GitHub down | the turn succeeds and the disk has it; the health check says the last write failed; the next save writes |
| A file changed underneath, or already there when the server starts | read again and written |
| A removed learner | the file is removed and the learner does not come back |
| Wrong settings | the server runs on its disk; `GET /api/health` gives the reason |

## Decision

Built as designed in [`architecture.md`](architecture.md) and deployed with round 144 by a merge to `main`
(2026-11-22; what the deploy's runs did is in the status report's addendum).

Decisions Claude took:

1. **The whole save is written, not only the place in the curriculum**, so that everything can be put back. The
   place in the curriculum is the summary at the top of the file and the commit's message.
2. **No learner id in the repository** (a hashed file name, the id left out of the file), because this repository is
   public.
3. **A branch of its own** (`saves`), made by the server, and `[skip ci]` on every commit.
4. **Wrong settings do not stop the server.** It says so in the health check.
5. **The browser's copy stays** as a second line.

## Evidence

`server/test/github-saves.test.js`; `server/src/github-saves.js`.

## Claim boundary

- **Not run against GitHub.** No token was at hand. The fake follows GitHub's documented routes as far as they were
  read (search extracts, not pages). The first write from the hosted server is the check.
- **Up to about ten seconds of play can be lost** if the server is killed without being asked to stop: the copy
  waits that long so that an answer does not cost a commit each.
- **A public repository shows progress** to whoever opens the branch, without saying whose it is.

## Open items

- **The owner:** make a fine-grained token with "Contents: Read and write" on a repository (a private one keeps the
  progress private), and enter `PARALLANG_GITHUB_TOKEN` and `PARALLANG_GITHUB_REPO` in Render → the service →
  Environment. Then `https://parallang.onrender.com/api/health` shows `"kind": "github"`, and after a conversation
  the `saves` branch has a commit.
- This deploy still loses the runs the server holds now: nothing was written to GitHub before it.
- Not built: one file listing every learner's place; a retention or history view (the branch's commits are the
  history).
