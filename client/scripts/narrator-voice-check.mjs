// Round 196: the narrator's voice and the road's voice space in a real browser. Plays the built client in headless
// Chromium against the real server code with a scripted model, with a fake speech engine that has an iPhone's voices
// and logs every utterance (headless Chromium has no voices of its own). Checks that a line's narrative is read by
// the English storyteller before the character's line, that the travel passage is read on the way, that the next
// character's line waits for it, and that the road's characters sound different from one another.
//
//   npm run build -w client
//   node client/scripts/narrator-voice-check.mjs [outDir]
import { RoadProvider } from '../../server/test/road-helpers.js';
import { openGame } from './lib/play.mjs';

const game = await openGame({ out: process.argv[2] ?? 'docs/rounds/196/shots', display: { voices: true }, provider: (content) => new RoadProvider(content), serviceOptions: { seedSource: () => 4242 } });

await game.run(async ({ page, check, shot, tap, say, runtime }) => {
  await page.addInitScript(() => {
    const voice = (name, lang) => ({ name, lang, localService: true, default: false, voiceURI: name });
    const voices = [voice('Samantha', 'en-US'), voice('Daniel', 'en-GB'), voice('Alice', 'it-IT'), voice('Federica', 'it-IT'), voice('Luca', 'it-IT'),
      voice('Eddy', 'it-IT'), voice('Flo', 'it-IT'), voice('Grandma', 'it-IT'), voice('Grandpa', 'it-IT'), voice('Reed', 'it-IT'), voice('Rocko', 'it-IT'), voice('Sandy', 'it-IT'), voice('Shelley', 'it-IT')];
    const log = [];
    window.__speech = log;
    let queue = [];
    const next = () => {
      const utterance = queue[0];
      if (!utterance) return;
      // About a word every 0.12 s, so a passage takes a while.
      utterance.timer = setTimeout(() => { queue.shift(); utterance.onend?.(); next(); }, 300 + 120 * utterance.text.split(/\s+/).length);
    };
    const engine = {
      getVoices: () => voices,
      get speaking() { return queue.length > 0; },
      speak(utterance) {
        log.push({ text: utterance.text, lang: utterance.lang, voice: utterance.voice?.name ?? null, pitch: utterance.pitch, rate: utterance.rate, at: Math.round(performance.now()) });
        queue.push(utterance);
        if (queue.length === 1) next();
      },
      cancel() { for (const utterance of queue) clearTimeout(utterance.timer); queue = []; log.push('cancel'); },
      addEventListener() {}, removeEventListener() {},
    };
    Object.defineProperty(window, 'speechSynthesis', { value: engine, configurable: true });
    window.SpeechSynthesisUtterance = function Utterance(text) { this.text = text; this.volume = 1; this.pitch = 1; this.rate = 1; };
  });
  const log = () => page.evaluate(() => window.__speech);
  const lines = (entries) => entries.filter((entry) => entry !== 'cancel');

  await game.toRoad();
  await page.locator('body').tap(); // a first tap, as a player's (iOS lets a page speak after one)
  await tap(page.getByRole('button', { name: /^Talk to / }));
  await page.locator('.dialogue-panel article.npc-message').first().waitFor({ timeout: 60000 });
  await page.waitForTimeout(500);
  let spoken = lines(await log()).filter((entry) => entry.text.trim());
  const firstLine = (await page.locator('.dialogue-panel article.npc-message').first().locator('.npc-native, [lang]').first().textContent().catch(() => '')) ?? '';
  const narrated = spoken.filter((entry) => entry.voice === 'Daniel');
  const voiced = spoken.filter((entry) => entry.lang === 'it-IT');
  check(narrated.length > 0 && narrated.every((entry) => entry.lang === 'en-GB' && entry.pitch < 1 && entry.rate < 1), `the narrator reads the line's narrative as Daniel, slower and lower (${narrated.map((entry) => `"${entry.text.slice(0, 40)}"`).join(', ')})`);
  check(voiced.length > 0 && spoken.indexOf(narrated[0]) < spoken.indexOf(voiced.at(-1)), `then the character's line, in Italian (${voiced.at(-1)?.voice}, pitch ${voiced.at(-1)?.pitch}, rate ${voiced.at(-1)?.rate})`);
  console.log(`  first line on screen: ${firstLine.slice(0, 60)}`);
  const firstVoice = voiced.at(-1);
  await shot('01-first-line');

  // Answer, go on, and listen on the way.
  const learnerId = await page.evaluate(() => localStorage.getItem('parallang.learnerId'));
  const session = runtime.service.encounters.get(learnerId);
  await say(runtime.service.definition(session).encounter.objectives.map((objective) => objective.accepted_examples[0]).join(' '));
  await page.getByRole('button', { name: 'Continue' }).waitFor({ timeout: 60000 });
  const before = (await log()).length;
  await tap(page.getByRole('button', { name: 'Continue' }));
  await page.locator('.caption .narration').waitFor({ timeout: 60000 });
  await page.waitForTimeout(300);
  const passage = (await page.locator('.caption .narration').evaluate((element) => [...element.childNodes].filter((node) => !(node.classList?.contains('narration-after'))).map((node) => node.textContent).join('').trim()));
  await shot('02-on-the-way');
  await page.locator('.dialogue-panel article.npc-message').first().waitFor({ timeout: 90000 });
  await page.waitForTimeout(1500);
  const after = (await log()).slice(before);
  const read = after.findIndex((entry) => entry !== 'cancel' && entry.voice === 'Daniel' && passage.startsWith(entry.text.trim().slice(0, 20)));
  check(read >= 0, `the travel passage is read by the narrator ("${passage.slice(0, 50)}…")`);
  const reply = after.findIndex((entry, index) => index > read && entry !== 'cancel' && entry.lang === 'it-IT');
  check(reply > read, 'the next character\'s line comes after it');
  check(!after.slice(read + 1, reply + 1).includes('cancel'), 'and nothing of the passage was cut off for it');
  const secondVoice = after[reply];
  check(Boolean(firstVoice && secondVoice) && `${firstVoice.voice}|${firstVoice.pitch}|${firstVoice.rate}` !== `${secondVoice.voice}|${secondVoice.pitch}|${secondVoice.rate}`,
    `two characters, two voices: ${firstVoice?.voice} ${firstVoice?.pitch}/${firstVoice?.rate} and ${secondVoice?.voice} ${secondVoice?.pitch}/${secondVoice?.rate}`);
  await shot('03-next-line');

  // Settings: "Narrator reads aloud", on, under Character voices.
  await tap(page.getByRole('button', { name: /^Menu/ }));
  await tap(page.getByRole('navigation', { name: 'Game menu' }).getByRole('button', { name: 'Settings' }));
  const box = page.getByLabel('Narrator reads aloud');
  await box.waitFor({ state: 'attached' });
  check(await box.isChecked(), 'Settings has "Narrator reads aloud", ticked');
  await box.scrollIntoViewIfNeeded();
  await shot('04-settings');
});
