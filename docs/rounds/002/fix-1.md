Implemented the requested logging repair.

- Updated [server/src/app.js](/Users/bary/Library/Application%20Support/Coding%20Philharmonica/worktrees/5b812489-fef7-4cba-aede-7a7ea181ff87/002/server/src/app.js:33) so unexpected non-`AppError` failures append `error.message` to server logs. Browser responses remain generic, and wrapped provider errors remain sanitized.
- Added regression coverage in [learning-flow.test.js](/Users/bary/Library/Application%20Support/Coding%20Philharmonica/worktrees/5b812489-fef7-4cba-aede-7a7ea181ff87/002/server/test/learning-flow.test.js:90).

Ran:

- `node --test server/test/learning-flow.test.js server/test/cli-learning-flow.test.js` — 13/13 passed.
- `git diff --check` — clean.
