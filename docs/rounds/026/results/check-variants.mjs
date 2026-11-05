// Round 026: prints, per pack and encounter, the base ratio and that both rule variants render (a dry run, no calls).
import { loadGameContent } from '../../../../server/src/content-loader.js';
import { greetingMessages, variants } from './greeting-replay.mjs';
for (const code of ['it', 'es']) {
  const content = loadGameContent({ language: code });
  for (const [id, definition] of content.encounters) {
    const { messages, ratio } = greetingMessages(content, definition);
    const pair = variants(messages, ratio, content.language.name);
    console.log(code, id, ratio, pair.new[0].content.length - pair.old[0].content.length);
  }
}
