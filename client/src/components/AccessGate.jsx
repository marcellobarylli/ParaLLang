import { useEffect, useState } from 'react';
import { ACCESS_EVENT, SAME_ORIGIN_API, loadGeminiKey, loadSettings, saveGeminiKey, saveSettings } from '../api/settings.js';
import { reloadPage } from '../viewport.js';

// Round 171: what a friend sees when the game cannot play for them yet. With no code stored (or one the server
// refused), the friend code the owner gave them. When the server has no AI model for them (no key, a refused key, a
// spent free allowance), the steps for a free Gemini key of their own. Either is kept in this browser and the page
// reloads with it.
const MODEL_TEXT = {
  MODEL_SETUP_REQUIRED: 'The game needs an AI model to voice its characters. Connect a free one in three steps.',
  MODEL_KEY_INVALID: 'Google did not accept that key. Make a new one and paste it below.',
  MODEL_QUOTA_EXHAUSTED: 'The shared free allowance has run out for now. Connect your own free key to keep playing.',
};

export function initialGate({ sameOrigin = SAME_ORIGIN_API, settings = loadSettings() } = {}) {
  return !sameOrigin && !settings.token ? { kind: 'code', first: true } : null;
}

export default function AccessGate({ reload = reloadPage }) {
  const [gate, setGate] = useState(() => initialGate());
  const [value, setValue] = useState('');
  useEffect(() => {
    // The page's first requests, made before any code was entered, are refused too: the welcome stays as it is.
    const show = (event) => setGate((shown) => {
      if (shown?.kind === 'code' && event.detail?.kind === 'code') return shown;
      setValue('');
      return { kind: event.detail?.kind, code: event.detail?.code };
    });
    globalThis.addEventListener?.(ACCESS_EVENT, show);
    return () => globalThis.removeEventListener?.(ACCESS_EVENT, show);
  }, []);
  if (!gate) return null;

  const submit = (event) => {
    event.preventDefault();
    const entered = value.trim();
    if (!entered) return;
    if (gate.kind === 'code') saveSettings({ ...loadSettings(), token: entered });
    else saveGeminiKey(entered);
    reload();
  };

  if (gate.kind === 'code') {
    return (
      <div className="sheet-backdrop access-gate">
        <form className="settings-sheet" role="dialog" aria-modal="true" aria-labelledby="access-title" onSubmit={submit}>
          <h2 id="access-title">Welcome to ParaLLang</h2>
          <p>{gate.first ? 'Enter the friend code you were given to start playing.' : 'That code did not work. Check it and enter it again.'}</p>
          <label htmlFor="access-code">Friend code</label>
          <input id="access-code" type="password" autoComplete="current-password" spellCheck="false" autoFocus
            value={value} onChange={(event) => setValue(event.target.value)} />
          <div className="button-row">
            <button type="submit" className="primary-button">Play</button>
          </div>
        </form>
      </div>
    );
  }

  const hasOwnKey = Boolean(loadGeminiKey());
  return (
    <div className="sheet-backdrop access-gate">
      <form className="settings-sheet" role="dialog" aria-modal="true" aria-labelledby="access-title" onSubmit={submit}>
        <h2 id="access-title">Connect an AI model</h2>
        <p>{MODEL_TEXT[gate.code] ?? MODEL_TEXT.MODEL_SETUP_REQUIRED}</p>
        <ol className="access-steps">
          <li>Open <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">aistudio.google.com/apikey</a> and sign in with a Google account.</li>
          <li>Press <strong>Create API key</strong> and copy the key. It is free.</li>
          <li>Paste it here and press <strong>Connect</strong>.</li>
        </ol>
        <label htmlFor="access-key">Your Gemini key</label>
        <input id="access-key" type="password" autoComplete="off" spellCheck="false" autoFocus
          value={value} onChange={(event) => setValue(event.target.value)} />
        <small>Kept in this browser only. The game sends it with your turns and never stores it.</small>
        <div className="button-row">
          <button type="submit" className="primary-button">Connect</button>
          {hasOwnKey && <button type="button" className="secondary-button" onClick={() => { saveGeminiKey(''); reload(); }}>Remove my key</button>}
          <button type="button" className="secondary-button" onClick={() => setGate(null)}>Close</button>
        </div>
      </form>
    </div>
  );
}
