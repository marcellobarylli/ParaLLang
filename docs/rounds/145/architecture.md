# Round 145 architecture

**Conversational round, recorded with the build.** Opened on 2026-11-22 by the owner's reply to round 144's report;
the owner's words are in [`trail/interview.md`](trail/interview.md). No pre-run commit; nothing here is frozen.

- **Design source:** the owner's request; [round 144](../144/architecture.md) (the browser's copy of the save, and
  `GET /api/save` / `POST /api/save/restore`); [`docs/handoff.md`](../../handoff.md) (the hosted server's disk is
  lost on every restart).
- **Findings:** [`findings.md`](findings.md).
- **Artifact:** `server/src/github-saves.js`, `server/server.js`, `server/src/app.js` (the health check),
  `saveSummary` in `server/src/road/service.js`, `server/test/github-saves.test.js`, `render.yaml`, `.env.example`,
  the README.

## Goal

A save that is safer than a copy in one browser: JSON written to GitHub that says where the learner is in the
curriculum. And round 144 deployed.

## Design

**The server writes the save.** The page on GitHub Pages cannot hold a credential that may write to a repository, so
the write is the server's, with a token only the owner can make. The settings are `PARALLANG_GITHUB_TOKEN` (a
fine-grained token with "Contents: Read and write" on one repository) and `PARALLANG_GITHUB_REPO` (`owner/name`),
with `PARALLANG_GITHUB_BRANCH` (default `saves`, never `main`) and `PARALLANG_GITHUB_DIR` (default `saves`). Without
the first two nothing changes. With settings that are wrong the server runs on its disk and the health check says
why; it does not refuse to start, because the game would be down for a setting that is optional.

**A storage around the storage.** `MirroredLearningStorage` wraps the disk storage, so the service does not change
and every kind of progress is covered, not only the road's:

- `save` writes the disk as before and schedules a copy to GitHub about ten seconds later: one write per learner for
  all the saves of that time, and at once when the server is stopped (`flush`). A write that fails is logged and made
  again with the next save. It never fails a turn.
- `load` reads the disk; a learner the disk does not know is looked for on GitHub and, when found, written to the
  disk. So after a restart every learner is back at their next request, whichever device asks. A learner GitHub does
  not have is not asked for again for a minute.
- `remove` removes both.

**The file** is `saves/<language>/<hash>.json` on a branch of its own with no history in common with the code (the
server makes it, as one parentless commit, when it is missing). It holds `format`, `language`, `savedAt`, a
`summary` and the whole `save` without the receipts of past answers. The summary is what the owner asked for: the
level, the Spellbook's size, the dungeons' runs and the curriculum (position by stage and unit, lessons and units
done, the recent success rate, every unit's state). The commit's message is the summary's one line, for example
"save 1a2b3c4d (it): A1, unit 2 of 36 (Where you are from), 4 of 108 lessons, 7 conversations [skip ci]".

**No learner id in the repository.** The repository of this project is public. A learner's id is what a browser
shows the server to be that learner, so the file's name is a hash of the id and the id is left out of the file; the
server puts it back when it restores. Progress is still readable by whoever can read the repository.

**No workflow and no deploy.** Every commit message carries `[skip ci]`, which GitHub Actions honours for pushes,
and the branch is not `main`, which is what Pages and Render deploy from.

**Seen from outside.** `GET /api/health` (no token needed) says `saves: { kind: 'github', lastWriteAt, lastWriteOk,
restored }` or `{ kind: 'disk' }`, with `problem` when the settings are wrong.

The browser's copy of round 144 stays as a second line: it is used only when the server answers that it did not know
the learner.

## Tests

`server/test/github-saves.test.js`, against a GitHub written in the test file (the contents and git-data routes the
server uses): the settings; a conversation written to a new branch as a file with the summary and without the id; a
server with an empty disk restoring from it; a learner never seen asked for once; GitHub down; a file changed
underneath; a removal. And the server's own entry started with and without the settings.

## Claim boundary

**Not run against GitHub.** The session has no token for the repository's contents API, and the hosted server's
settings are the owner's to enter. GitHub's documentation was read as search extracts: an update must name the
file's `sha`, and the route answers 409 or 422 when it does not fit; the code reads the `sha` again and writes once
more on either. The first write from the hosted server is the real check.

## Outcome

See [`findings.md`](findings.md).
