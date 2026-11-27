// Round 202: the narrator's hosted voice: Gemini's text-to-speech asked for a clip, its PCM wrapped as a WAV, kept by
// its text; and the route that hands it to the page, or says there is none.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { NARRATOR_MODEL, NARRATOR_VOICE, createNarratorVoice, wavOf } from '../src/narrator-voice.js';

const quiet = { warn() {}, error() {} };
const pcm = Buffer.from([1, 0, 2, 0, 3, 0, 4, 0]);
const google = (calls, reply = () => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/L16;codec=pcm;rate=24000', data: pcm.toString('base64') } }] } }] }) })) =>
  async (url, init) => { calls.push({ url, key: init.headers['x-goog-api-key'], body: JSON.parse(init.body) }); return reply(); };

test('a clip is asked of the text-to-speech model with the voice, wrapped as a WAV and kept by its text', async () => {
  const calls = [];
  const voice = createNarratorVoice({ apiKey: 'server-key', fetchImpl: google(calls), logger: quiet });
  const clip = await voice.speak('  You stop at   the cart. ');
  assert.equal(calls[0].url, `https://generativelanguage.googleapis.com/v1beta/models/${NARRATOR_MODEL}:generateContent`);
  assert.equal(calls[0].key, 'server-key');
  assert.deepEqual(calls[0].body.generationConfig, { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: NARRATOR_VOICE } } } });
  assert.match(calls[0].body.contents[0].parts[0].text, /storyteller[^:]*: You stop at the cart\.$/);
  assert.equal(clip.type, 'audio/wav');
  assert.deepEqual(clip.audio, wavOf(pcm));
  assert.equal(clip.audio.subarray(0, 4).toString(), 'RIFF');
  assert.equal(clip.audio.readUInt32LE(24), 24000);
  assert.equal(clip.audio.readUInt32LE(40), pcm.length);
  await voice.speak('You stop at the cart.');
  assert.equal(calls.length, 1, 'the same text is not asked for twice');
  assert.deepEqual(voice.status(), { hosted: true, model: NARRATOR_MODEL, voice: NARRATOR_VOICE, last: 'ok' });
  await voice.speak('Another.', { apiKey: 'friend-key' });
  assert.equal(calls[1].key, 'friend-key');
});

test('no key, a refusal, a spent allowance and an answer without sound are NARRATOR_UNAVAILABLE, with whether to ask again', async () => {
  const failure = async (voice, text = 'Hello.') => { try { await voice.speak(text); } catch (error) { return error; } return null; };
  const none = await failure(createNarratorVoice({ logger: quiet }));
  assert.deepEqual([none.status, none.code, none.details.pause], [503, 'NARRATOR_UNAVAILABLE', false]);
  const reply = (status) => () => ({ ok: false, status, json: async () => ({ error: { message: 'no' } }) });
  const refused = await failure(createNarratorVoice({ apiKey: 'k', fetchImpl: google([], reply(403)), logger: quiet }));
  assert.deepEqual([refused.code, refused.details.pause], ['NARRATOR_UNAVAILABLE', false]);
  const spent = await failure(createNarratorVoice({ apiKey: 'k', fetchImpl: google([], reply(429)), logger: quiet }));
  assert.deepEqual([spent.code, spent.details.pause], ['NARRATOR_UNAVAILABLE', true]);
  const silent = await failure(createNarratorVoice({ apiKey: 'k', fetchImpl: google([], () => ({ ok: true, status: 200, json: async () => ({ candidates: [] }) })), logger: quiet }));
  assert.deepEqual([silent.code, silent.details.pause], ['NARRATOR_UNAVAILABLE', true]);
  const down = await failure(createNarratorVoice({ apiKey: 'k', fetchImpl: async () => { throw new Error('offline'); }, logger: quiet }));
  assert.equal(down.code, 'NARRATOR_UNAVAILABLE');
  const voice = createNarratorVoice({ apiKey: 'k', fetchImpl: google([]), logger: quiet });
  assert.equal((await failure(voice, '   ')).code, 'VALIDATION_ERROR');
  assert.equal((await failure(voice, 'x'.repeat(1501))).code, 'VALIDATION_ERROR');
});

test('POST /api/narrate answers with the sound, needs the token, and says so when the server has no voice', async (t) => {
  const service = { content: null };
  const serve = async (options) => {
    const server = createApp({ service, logger: quiet, ...options }).listen(0);
    t.after(() => server.close());
    await new Promise((resolve) => server.once('listening', resolve));
    return `http://127.0.0.1:${server.address().port}`;
  };
  const post = (base, headers = {}) => fetch(`${base}/api/narrate`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ text: 'You stop at the cart.' }) });
  const calls = [];
  const withVoice = await serve({ token: 'secret', narratorVoice: createNarratorVoice({ apiKey: 'k', fetchImpl: google(calls), logger: quiet }) });
  assert.equal((await post(withVoice)).status, 401);
  const ok = await post(withVoice, { 'X-ParaLLang-Token': 'secret' });
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('content-type'), 'audio/wav');
  assert.deepEqual(Buffer.from(await ok.arrayBuffer()), wavOf(pcm));
  const without = await post(await serve({}));
  assert.equal(without.status, 503);
  assert.deepEqual((await without.json()).error.details, { pause: false });
});
