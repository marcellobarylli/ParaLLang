# Interview: round 145

### Q0 (2026-11-22): the owner's reply to round 144's report (no question was asked)
- **Options offered:** none. Round 144's report said that the browser now keeps a copy of the save and puts it back
  when the server has lost it, and asked for the owner's word on a deploy.
- **Answer:** "We need a safer saving scheme than browser-based. This could be json based that is written to github for
  now on where we are in the curriculum, for now. The rest is good for now, deploy"

Claude's reading, which the owner has not confirmed:

- **A save that does not depend on a browser.** The save is written as JSON to GitHub, so it outlives the hosted
  server's disk and any one device. "Where we are in the curriculum" is the least it must hold; "for now" marks it
  as a stopgap, not the final store.
- **Who writes it.** The server: a page on GitHub Pages holds no credential that may write to a repository. The
  server needs a GitHub token, which only the owner can create and put into Render's secrets.
- **"The rest is good for now, deploy":** round 144 is accepted as it is, and the branch is to be merged to `main`,
  which deploys the client and the server. The decisions round 144 listed for the owner are taken as accepted "for
  now".
