// Round 213: a server to try the breathing against by hand. It is the real server code with a scripted grader (no
// model is called), and it holds each reply to an answer back for some seconds, as a model would. It prints where it
// listens and its token; put both in the page's Settings (Server), or in `parallang.settings` in the browser's
// storage, and choose Strict checking (the scripted grader does not play light turns).
//
//   node client/scripts/breath-play.mjs [seconds a reply is held back: 8]
import { loadGameContent } from '../../server/src/content-loader.js';
import { PassingProvider, createRuntime } from '../../server/test/helpers.js';

const seconds = Number(process.argv[2] ?? 8);
const content = loadGameContent({ language: 'it' });
const runtime = await createRuntime({ language: 'it', content, provider: new PassingProvider(content), clock: () => new Date(), serviceOptions: { exchangeLimit: 3 } });
const submit = runtime.service.submitDialogue.bind(runtime.service);
runtime.service.submitDialogue = async (...args) => {
  const result = await submit(...args);
  await new Promise((done) => setTimeout(done, seconds * 1000));
  return result;
};
console.log(JSON.stringify({ serverUrl: runtime.baseUrl, token: runtime.token, heldBack: seconds }));
console.log('An answer that passes at the first site of Ta Prohm: Buongiorno! Mi chiamo Luigione. Come ti chiami?');
process.on('SIGINT', async () => { await runtime.close(); process.exit(0); });
