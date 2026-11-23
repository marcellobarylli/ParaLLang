# Round 174 findings

## Question

Why did a conversation go on after three exchanges, and is every conversation now complete on the third reply, with
a counter and a way to keep chatting?

## Finding

A strict conversation ended only when every objective was met (an encounter allows 20 turns), and light mode ran
three to five turns; with an objective that the grader kept failing there was no end but Leave. Now every
conversation is complete on the third reply, the counter shows which reply is next, and "Keep chatting" goes on
without counting.

## Method

Server and web-client tests with scripted graders; `node client/scripts/exchange-check.mjs` plays a road
conversation in headless Chromium at phone width against the real server code with a scripted provider (three
replies that meet nothing, then a chat). No model was called.

## Results

| Check | Result |
|---|---|
| Server tests | 584 of 584 (581 before; 3 new in `exchange-limit.test.js`) |
| Web client tests | 297 of 297 (296 before; 1 new: three replies, then a chat that counts nothing) |
| Aesthetic package tests | 95 of 95 |
| In the browser | Counter "Reply 1 of 3" and "Reply 2 of 3" ([shot](shots/01-reply-2-of-3.jpg)); complete on the third reply with Continue and Keep chatting ([shot](shots/02-complete-after-three.jpg)); a chat answered, the panel folded ([shot](shots/03-chatting-on.jpg)); Done chatting brings Continue back |

## Open items

- How a live model winds the character up on the third reply has not been seen.
- The owner may want the limit per mode (a strict lesson of three objectives can end with objectives unmet).
