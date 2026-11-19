import { useEffect, useState } from 'react';
import { PANEL_OPACITY, clampPanelOpacity } from '../display.js';
import { BUILD_ID } from '../build.js';
import { requestTiltPermission } from '../scene/tilt.js';
import { describeViewport, latestBuild, measureViewport, reloadPage } from '../viewport.js';

// Round 118: which build runs, what the browser reports about its viewport (so a screenshot of Settings carries
// both), whether the site holds a newer build, and a reload that goes past the browser's cache.
const SITE = { build: BUILD_ID, latestBuild, reload: reloadPage, viewport: measureViewport, requestTilt: () => requestTiltPermission() };
// Round 125: what the browser answered when the box was ticked, if it was not a yes.
const TILT_ANSWERS = { denied: 'This browser refused access to the phone\'s motion sensor, so the view will not move.', unsupported: 'This device reports no motion sensor.' };

// Round 114: the server URL and the access token (PARALLANG_TOKEN on the server). Both stay in this browser's
// localStorage; the token is sent as X-ParaLLang-Token. A blank URL means this page's own /api (the dev proxy).
// Round 117: the opacity of the text panels over the level. The slider applies at once and needs no save; the sheet
// takes the same background, so it shows the result while the slider moves.
// Round 129: "Beginner mode": a mistake in an answer is corrected for a heart and the conversation moves on.
// Round 127: "Ambient music" switches the generated background music (ambience.js).
// Round 126: "Character voices" switches the reading aloud of new lines, and the sheet says what this browser can do.
// Round 125: "Tilt to look". Ticking the box is the tap from which the page may ask iOS for the phone's orientation.
export default function SettingsSheet({ settings, onSave, onClose, panelOpacity = PANEL_OPACITY.default, onPanelOpacity, tiltLook = false, onTiltLook, beginner = true, onBeginner, music = true, onMusic, musicSupported = true, voices = true, onVoices, speechSupport = { speak: true, listen: true }, site = SITE }) {
  const [serverUrl, setServerUrl] = useState(settings.serverUrl);
  const [token, setToken] = useState(settings.token);
  const submit = (event) => {
    event.preventDefault();
    onSave({ serverUrl, token });
  };
  const [tiltAnswer, setTiltAnswer] = useState(null);
  const changeTilt = (event) => {
    const on = event.target.checked;
    setTiltAnswer(null);
    if (on) Promise.resolve(site.requestTilt?.() ?? 'granted').then(setTiltAnswer, () => setTiltAnswer('denied'));
    onTiltLook(on);
  };
  const percent = Math.round(clampPanelOpacity(panelOpacity) * 100);
  const [newest, setNewest] = useState(null);
  useEffect(() => {
    let current = true;
    Promise.resolve(site.latestBuild()).then((build) => { if (current) setNewest(build); }, () => {});
    return () => { current = false; };
  }, [site]);
  const outdated = Boolean(newest) && newest !== site.build;
  return (
    <div className="sheet-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form className="settings-sheet" role="dialog" aria-modal="true" aria-labelledby="settings-title" onSubmit={submit}>
        <h2 id="settings-title">Settings</h2>
        {onPanelOpacity && (
          <>
            <div className="setting-row"><label htmlFor="settings-opacity">Text panel opacity</label><output htmlFor="settings-opacity">{percent}%</output></div>
            <input id="settings-opacity" type="range" min={PANEL_OPACITY.min * 100} max={PANEL_OPACITY.max * 100} step={PANEL_OPACITY.step * 100}
              value={percent} aria-valuetext={`${percent}%`} onChange={(event) => onPanelOpacity(Number(event.target.value) / 100)} />
            <small>Lower it to see more of the temple behind the text. It applies at once.</small>
          </>
        )}
        {onBeginner && (
          <>
            <label className="setting-check" htmlFor="settings-beginner">
              <input id="settings-beginner" type="checkbox" checked={beginner} onChange={(event) => onBeginner(event.target.checked)} />
              <span>Beginner mode</span>
            </label>
            <small>Answer in the language you are learning, in English or in a mixture. A mistake, or English, is corrected for you and costs one heart; you move on. Off: an answer must be right to count, and nothing is corrected.</small>
          </>
        )}
        {onMusic && (
          <>
            <label className="setting-check" htmlFor="settings-music">
              <input id="settings-music" type="checkbox" checked={music} onChange={(event) => onMusic(event.target.checked)} disabled={!musicSupported} />
              <span>Ambient music</span>
            </label>
            <small>{musicSupported ? 'Quiet chords in the background. They drop while a character speaks and stop while you speak.' : 'This browser cannot play it.'}</small>
          </>
        )}
        {onVoices && (
          <>
            <label className="setting-check" htmlFor="settings-voices">
              <input id="settings-voices" type="checkbox" checked={voices} onChange={(event) => onVoices(event.target.checked)} disabled={!speechSupport.speak} />
              <span>Character voices</span>
            </label>
            <small>{speechSupport.speak ? 'Each character reads its lines aloud in its own voice. A line\'s 🔊 repeats it.' : 'This browser cannot read aloud.'}</small>
            <small>{speechSupport.listen ? 'The 🎤 beside the reply box writes what you say. You send it.' : 'This browser cannot listen. The keyboard\'s own microphone key still writes what you say.'}</small>
          </>
        )}
        {onTiltLook && (
          <>
            <label className="setting-check" htmlFor="settings-tilt">
              <input id="settings-tilt" type="checkbox" checked={tiltLook} onChange={changeTilt} />
              <span>Tilt to look</span>
            </label>
            <small>In a conversation, tilting the phone turns the view a little. The phone may ask for access to motion.</small>
            {tiltLook && TILT_ANSWERS[tiltAnswer] && <small role="status" className="setting-warning">{TILT_ANSWERS[tiltAnswer]}</small>}
          </>
        )}
        <label htmlFor="settings-server">Server URL</label>
        <input id="settings-server" type="url" inputMode="url" autoComplete="url" placeholder="https://parallang.onrender.com"
          value={serverUrl} onChange={(event) => setServerUrl(event.target.value)} />
        <small>Leave blank to use this page's own server (local development).</small>
        <label htmlFor="settings-token">Access token</label>
        <input id="settings-token" type="password" autoComplete="current-password" spellCheck="false"
          value={token} onChange={(event) => setToken(event.target.value)} />
        <small>The server's PARALLANG_TOKEN. It is kept in this browser only.</small>
        <div className="button-row">
          <button type="submit" className="primary-button">Save and connect</button>
          <button type="button" className="secondary-button" onClick={onClose}>Close</button>
        </div>
        <p className="build-line">
          {outdated && <strong role="status">A newer build is on the site ({newest}). </strong>}
          {describeViewport(site.viewport(), site.build)}
        </p>
        <div className="button-row">
          <button type="button" className={outdated ? 'primary-button' : 'secondary-button'} onClick={() => site.reload()}>Reload the page</button>
        </div>
      </form>
    </div>
  );
}
