// @vitest-environment node
// Round 126: the dungeon speaks and listens. A character sheet's voice becomes a system voice, a pitch and a rate;
// the speaker reads a line with them; the listener writes what the browser's recognition hears.
import { describe, expect, test, vi } from 'vitest';
import { LISTEN_PROBLEMS, VOICE_KINDS, createListener, createSpeaker, pickVoice, spokenText, voiceProfile } from '../speech.js';

const voice = (name, lang) => ({ name, lang, localService: true });
// Like an iPhone with the Italian and Spanish voices installed, and an Android with Google's one voice a language.
const IPHONE = [voice('Samantha', 'en-US'), voice('Alice', 'it-IT'), voice('Alice (Enhanced)', 'it-IT'), voice('Luca', 'it-IT'), voice('Eddy', 'it-IT'), voice('Flo', 'it-IT'), voice('Grandpa', 'it-IT'), voice('Shelley', 'it-IT'), voice('Mónica', 'es-ES'), voice('Jorge', 'es-ES'), voice('Paulina', 'es-MX')];
const ANDROID = [voice('Google US English', 'en-US'), voice('Google italiano', 'it-IT'), voice('Google español', 'es-ES')];

describe('a voice for a character', () => {
  test('each kind has a pitch and a rate, and the sheet\'s own go over them', () => {
    expect(voiceProfile({ kind: 'female' })).toMatchObject({ kind: 'female', pitch: 1.1, rate: 0.95 });
    expect(voiceProfile({ kind: 'male' })).toMatchObject({ kind: 'male', pitch: 0.8, rate: 0.95 });
    expect(voiceProfile({ kind: 'creature' })).toMatchObject({ kind: 'creature', pitch: 1.6, rate: 1.05 });
    expect(voiceProfile({ kind: 'funny' })).toMatchObject({ kind: 'funny', pitch: 0.5, rate: 0.8 });
    expect(voiceProfile({ kind: 'creature', pitch: 1.7, rate: 1.15 })).toMatchObject({ pitch: 1.7, rate: 1.15 });
    expect(voiceProfile({ kind: 'male', pitch: 9, rate: 0.1 })).toMatchObject({ pitch: 2, rate: 0.5 }); // the browser's scales
    for (const none of [undefined, null, {}, { kind: 'robot' }, { kind: 'toString' }]) expect(voiceProfile(none)).toMatchObject({ kind: null, pitch: 1, rate: 1 });
    expect(Object.keys(VOICE_KINDS)).toEqual(['female', 'male', 'creature', 'funny']);
  });

  test('on a phone with several voices each kind gets a voice of its own, in the pack\'s language', () => {
    const pick = (kind, tag) => pickVoice(IPHONE, tag, voiceProfile({ kind }))?.name;
    expect(pick('female', 'it-IT')).toBe('Alice (Enhanced)'); // the better of the two Alices
    expect(pick('male', 'it-IT')).toBe('Luca');
    expect(pick('creature', 'it-IT')).toBe('Shelley');
    expect(pick('funny', 'it-IT')).toBe('Grandpa');
    expect(pick('female', 'es-ES')).toBe('Mónica');
    expect(pick('male', 'es-ES')).toBe('Jorge');
    expect(new Set(['female', 'male', 'creature', 'funny'].map((kind) => pick(kind, 'it-IT'))).size).toBe(4);
  });

  test('the pack\'s own region comes first, another region of the language is still a voice', () => {
    expect(pickVoice(IPHONE, 'es-ES', voiceProfile({ kind: 'creature' })).lang).toBe('es-ES');
    expect(pickVoice([voice('Paulina', 'es-MX')], 'es-ES', voiceProfile({ kind: 'male' })).name).toBe('Paulina');
    expect(pickVoice([voice('Luca', 'it_IT')], 'it-IT', voiceProfile({ kind: 'male' })).name).toBe('Luca');
  });

  test('with one voice of the language every kind gets it, and pitch and rate tell the characters apart', () => {
    for (const kind of Object.keys(VOICE_KINDS)) expect(pickVoice(ANDROID, 'it-IT', voiceProfile({ kind })).name).toBe('Google italiano');
    expect(pickVoice(ANDROID, 'it-IT').name).toBe('Google italiano');
  });

  test('a kind without a voice of its name avoids the other gender\'s, when there is a choice', () => {
    const some = [voice('Alice', 'it-IT'), voice('Voce 2', 'it-IT')];
    expect(pickVoice(some, 'it-IT', voiceProfile({ kind: 'male' })).name).toBe('Voce 2');
    expect(pickVoice(some, 'it-IT', voiceProfile({ kind: 'female' })).name).toBe('Alice');
    expect(pickVoice([voice('Alice', 'it-IT')], 'it-IT', voiceProfile({ kind: 'male' })).name).toBe('Alice');
  });

  test('no voice of the language is no voice', () => {
    expect(pickVoice(IPHONE, 'fr-FR', voiceProfile({ kind: 'female' }))).toBeNull();
    expect(pickVoice([], 'it-IT')).toBeNull();
    expect(pickVoice(undefined, 'it-IT')).toBeNull();
    expect(pickVoice(IPHONE, undefined)).toBeNull();
  });

  test('a line is read without its emphasis marks', () => {
    expect(spokenText('  *Buongiorno!*  Do you want a _caffè_?\n')).toBe('Buongiorno! Do you want a caffè?');
    expect(spokenText(null)).toBe('');
  });
});

function fakeSynthesis(voices = IPHONE) {
  const scope = {
    spoken: [], cancels: 0,
    SpeechSynthesisUtterance: function Utterance(text) { this.text = text; this.volume = 1; },
    speechSynthesis: { getVoices: () => voices, speak: (utterance) => scope.spoken.push(utterance), cancel: () => { scope.cancels += 1; } },
  };
  return scope;
}

describe('the speaker', () => {
  test('reads a line in the character\'s voice, pitch and rate, after stopping the line before', () => {
    const scope = fakeSynthesis();
    const speaker = createSpeaker(scope);
    expect(speaker.supported).toBe(true);
    expect(speaker.available('it-IT')).toBe(true);
    expect(speaker.available('fr-FR')).toBe(false);
    speaker.speak({ text: 'Vuoi un *caffè*?', tag: 'it-IT', voice: { kind: 'creature', pitch: 1.7, rate: 1.15 } });
    expect(scope.cancels).toBe(1);
    expect(scope.spoken).toHaveLength(1);
    expect(scope.spoken[0]).toMatchObject({ text: 'Vuoi un caffè?', lang: 'it-IT', pitch: 1.7, rate: 1.15 });
    expect(scope.spoken[0].voice.name).toBe('Shelley');
    speaker.speak({ text: 'Prosciutto.', tag: 'it-IT', voice: { kind: 'male' } });
    expect(scope.cancels).toBe(2);
    expect(scope.spoken[1].voice.name).toBe('Luca');
    speaker.stop();
    expect(scope.cancels).toBe(3);
  });

  test('with no voice of the language the browser gets the tag; an empty line is not spoken', () => {
    const scope = fakeSynthesis([voice('Samantha', 'en-US')]);
    const speaker = createSpeaker(scope);
    speaker.speak({ text: 'Ciao.', tag: 'it-IT', voice: { kind: 'female' } });
    expect(scope.spoken[0]).toMatchObject({ lang: 'it-IT', pitch: 1.1 });
    expect(scope.spoken[0].voice).toBeUndefined();
    expect(speaker.speak({ text: ' ** ', tag: 'it-IT' })).toBeNull();
    expect(scope.spoken).toHaveLength(1);
  });

  test('the first tap speaks one silent utterance, and only if nothing was spoken yet', () => {
    const scope = fakeSynthesis();
    const speaker = createSpeaker(scope);
    speaker.prime();
    speaker.prime();
    expect(scope.spoken).toHaveLength(1);
    expect(scope.spoken[0].volume).toBe(0);
    const other = fakeSynthesis();
    const spoke = createSpeaker(other);
    spoke.speak({ text: 'Ciao.', tag: 'it-IT' });
    spoke.prime();
    expect(other.spoken).toHaveLength(1);
  });

  test('a browser without speech synthesis is unsupported and does nothing', () => {
    const speaker = createSpeaker({});
    expect(speaker.supported).toBe(false);
    expect(speaker.available('it-IT')).toBe(false);
    expect(speaker.speak({ text: 'Ciao.', tag: 'it-IT' })).toBeNull();
    expect(() => { speaker.stop(); speaker.prime(); }).not.toThrow();
  });
});

function fakeRecognition({ throwOnStart = false } = {}) {
  const scope = { made: [] };
  scope.webkitSpeechRecognition = function Recognition() {
    scope.made.push(this);
    this.started = 0;
    this.stopped = 0;
    this.start = () => { if (throwOnStart) throw new Error('InvalidStateError'); this.started += 1; };
    this.stop = () => { this.stopped += 1; };
  };
  return scope;
}
const result = (transcript, isFinal) => Object.assign([{ transcript }], { isFinal });

describe('the listener', () => {
  test('listens in the pack\'s language and reports the words as they come, then the end', () => {
    const scope = fakeRecognition();
    const listener = createListener(scope);
    expect(listener.supported).toBe(true);
    const [onText, onEnd] = [vi.fn(), vi.fn()];
    expect(listener.start({ tag: 'it-IT', onText, onEnd })).toBe(true);
    const recognition = scope.made[0];
    expect(recognition).toMatchObject({ lang: 'it-IT', interimResults: true, continuous: false, started: 1 });
    expect(listener.listening).toBe(true);
    recognition.onresult({ results: [result('un caff', false)] });
    recognition.onresult({ results: [result(' un caffè ', true), result('senza latte', false)] });
    recognition.onresult({ results: [result('un caffè', true), result('senza latte', true)] });
    expect(onText.mock.calls).toEqual([['un caff', false], ['un caffè senza latte', false], ['un caffè senza latte', true]]);
    listener.stop();
    expect(recognition.stopped).toBe(1);
    recognition.onend();
    recognition.onend();
    expect(onEnd.mock.calls).toEqual([[null]]);
    expect(listener.listening).toBe(false);
  });

  test('a refusal ends with its reason; a silence and a stop are not problems', () => {
    for (const [error, problem] of [['not-allowed', 'not-allowed'], ['service-not-allowed', 'service-not-allowed'], ['network', 'network'], ['bad-grammar', 'failed'], ['no-speech', null], ['aborted', null]]) {
      const scope = fakeRecognition();
      const onEnd = vi.fn();
      createListener(scope).start({ tag: 'it-IT', onEnd });
      scope.made[0].onerror({ error });
      scope.made[0].onend();
      expect(onEnd, error).toHaveBeenCalledWith(problem);
      if (problem) expect(LISTEN_PROBLEMS[problem]).toBeTruthy();
    }
  });

  test('a start that throws, and a browser without recognition, end as failed', () => {
    const onEnd = vi.fn();
    expect(createListener(fakeRecognition({ throwOnStart: true })).start({ tag: 'it-IT', onEnd })).toBe(false);
    expect(onEnd).toHaveBeenCalledWith('failed');
    const none = createListener({});
    expect(none.supported).toBe(false);
    const never = vi.fn();
    expect(none.start({ onEnd: never })).toBe(false);
    expect(never).toHaveBeenCalledWith('failed');
    expect(() => none.stop()).not.toThrow();
  });

  test('the standard name is used before the prefixed one', () => {
    const scope = fakeRecognition();
    scope.SpeechRecognition = function Standard() { this.start = () => {}; this.stop = () => {}; scope.standard = true; };
    createListener(scope).start({ tag: 'es-ES' });
    expect(scope.standard).toBe(true);
    expect(scope.made).toHaveLength(0);
  });
});
