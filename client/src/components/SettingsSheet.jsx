import { useEffect, useState } from 'react';
import { IMMERSION, PANEL_OPACITY, VOLUME, clampImmersion, clampPanelOpacity, volumesOf } from '../display.js';
import { BUILD_ID } from '../build.js';
import { requestTiltPermission } from '../scene/tilt.js';
import { describeViewport, latestBuild, measureViewport, reloadPage } from '../viewport.js';
import SaveGuide from './SaveGuide.jsx';

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
// Round 153: "Checking": strict (an answer is marked) or light (nothing is marked; the character works out what was meant).
// Round 144: "Your save": when this browser last copied the save, a download of the copy as a file, and a file put back.
// Round 172: the sheet is in categories (Audio, Language and learning, Display and controls, Your save, Connection,
// This build), each a section that opens and closes. Audio holds four volume sliders: Master, Music, Effects (the
// rain, the thunder and the other sounds of the place) and Voices.

/** One category of the sheet: a heading that opens and closes it. */
function Group({ title, open = false, children }) {
  return (
    <details className="settings-group" open={open}>
      <summary>{title}</summary>
      <div className="settings-group-body">{children}</div>
    </details>
  );
}

const VOLUME_ROWS = Object.freeze([
  ['master', 'Master volume', 'Everything the game plays.'],
  ['music', 'Music volume', 'The quiet chords in the background.'],
  ['effects', 'Effects volume', 'Rain, thunder and the other sounds of the place.'],
  ['voice', 'Voice volume', 'The characters reading their lines aloud.'],
]);

/** A volume slider, 0 to 100 %. */
function VolumeSlider({ channel, label, note, value, onChange, disabled = false }) {
  const percent = Math.round(value * 100);
  const id = `settings-volume-${channel}`;
  return (
    <>
      <div className="setting-row"><label htmlFor={id}>{label}</label><output htmlFor={id}>{percent}%</output></div>
      <input id={id} type="range" min={VOLUME.min * 100} max={VOLUME.max * 100} step={VOLUME.step * 100} disabled={disabled}
        value={percent} aria-valuetext={`${percent}%`} onChange={(event) => onChange(channel, Number(event.target.value) / 100)} />
      <small>{note}</small>
    </>
  );
}

export default function SettingsSheet({ settings, onSave, onClose, panelOpacity = PANEL_OPACITY.default, onPanelOpacity, tiltLook = false, onTiltLook, beginner = true, onBeginner, light = false, onLight, treeModels = true, onTreeModels, immersion = IMMERSION.default, onImmersion, languageName = null, music = true, onMusic, musicSupported = true, voices = true, onVoices, speechSupport = { speak: true, listen: true }, volume = null, onVolume = null, site = SITE, savedAt = null, onExportCopy = null, onImportCopy = null, saveStore = null }) {
  const immersionPercent = Math.round(clampImmersion(immersion) * 100);
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
  const [copyNote, setCopyNote] = useState(null);
  const download = async () => {
    const text = await onExportCopy();
    if (!text) { setCopyNote('There is no copy yet: play a conversation first.'); return; }
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: `parallang-save-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setCopyNote('The save was written to a file.');
  };
  const upload = async (event) => {
    const [file] = event.target.files ?? [];
    event.target.value = '';
    if (!file) return;
    setCopyNote((await onImportCopy(await file.text())) ? 'The save was loaded.' : 'That file could not be loaded.');
  };
  const percent = Math.round(clampPanelOpacity(panelOpacity) * 100);
  const [newest, setNewest] = useState(null);
  useEffect(() => {
    let current = true;
    Promise.resolve(site.latestBuild()).then((build) => { if (current) setNewest(build); }, () => {});
    return () => { current = false; };
  }, [site]);
  const outdated = Boolean(newest) && newest !== site.build;
  const volumes = volumesOf(volume);
  return (
    <div className="sheet-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form className="settings-sheet" role="dialog" aria-modal="true" aria-labelledby="settings-title" onSubmit={submit}>
        <h2 id="settings-title">Settings</h2>
        {(onVolume || onMusic || onVoices) && (
          <Group title="Audio" open>
            {onVolume && VOLUME_ROWS.map(([channel, label, note]) => (
              <VolumeSlider key={channel} channel={channel} label={label} note={note} value={volumes[channel]} onChange={onVolume}
                disabled={(channel === 'music' && !musicSupported) || (channel === 'voice' && !speechSupport.speak)} />
            ))}
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
          </Group>
        )}
        {(onImmersion || onLight || onBeginner) && (
          <Group title="Language and learning">
            {onImmersion && (
              <>
                <div className="setting-row"><label htmlFor="settings-immersion">{`How much ${languageName ?? 'of the language'} the characters speak`}</label><output htmlFor="settings-immersion">{immersionPercent}%</output></div>
                <input id="settings-immersion" type="range" min={IMMERSION.min * 100} max={IMMERSION.max * 100} step={IMMERSION.step * 100}
                  value={immersionPercent} aria-valuetext={`${immersionPercent}%`} onChange={(event) => onImmersion(Number(event.target.value) / 100)} />
                <small>{immersionPercent >= 100
                  ? `Every line a character speaks is in ${languageName ?? 'the language you are learning'}. Its translation shows under it, sentence by sentence in matching colours, and costs nothing.`
                  : `About ${immersionPercent}% of each line is in ${languageName ?? 'the language you are learning'} and the rest in English. The translation of the line you are answering is a hint. At 100% it is free.`} It applies from the character's next line.</small>
              </>
            )}
            {onLight && (
              <>
                <fieldset className="setting-choice">
                  <legend>How answers are checked</legend>
                  <label><input type="radio" name="settings-checking" checked={!light} onChange={() => onLight(false)} /><span>Strict</span></label>
                  <label><input type="radio" name="settings-checking" checked={light} onChange={() => onLight(true)} /><span>Light</span></label>
                </fieldset>
                <small>{light
                  ? `Light: nothing is marked. The character works out what you meant, you are shown it in ${languageName ?? 'the language you are learning'}, and the conversation goes on. Each turn is quicker.`
                  : 'Strict: each answer is marked against what the conversation asks for before the character replies.'} It applies from your next answer.</small>
              </>
            )}
            {onBeginner && (
              <>
                <label className="setting-check" htmlFor="settings-beginner">
                  <input id="settings-beginner" type="checkbox" checked={beginner} onChange={(event) => onBeginner(event.target.checked)} disabled={light} />
                  <span>Beginner mode</span>
                </label>
                <small>{light ? 'Beginner mode belongs to strict checking. ' : ''}Answer in the language you are learning, in English or in a mixture. A mistake, or English, is corrected for you and costs one heart; you move on. Off: an answer must be right to count, and nothing is corrected.</small>
              </>
            )}
          </Group>
        )}
        {(onPanelOpacity || onTreeModels || onTiltLook) && (
          <Group title="Display and controls">
            {onPanelOpacity && (
              <>
                <div className="setting-row"><label htmlFor="settings-opacity">Text panel opacity</label><output htmlFor="settings-opacity">{percent}%</output></div>
                <input id="settings-opacity" type="range" min={PANEL_OPACITY.min * 100} max={PANEL_OPACITY.max * 100} step={PANEL_OPACITY.step * 100}
                  value={percent} aria-valuetext={`${percent}%`} onChange={(event) => onPanelOpacity(Number(event.target.value) / 100)} />
                <small>Lower it to see more of the temple behind the text. It applies at once.</small>
              </>
            )}
            {onTreeModels && (
              <>
                <label className="setting-check" htmlFor="settings-tree-models">
                  <input id="settings-tree-models" type="checkbox" checked={treeModels} onChange={(event) => onTreeModels(event.target.checked)} />
                  <span>Tree models</span>
                </label>
                <small>On the road, the trees nearest you are drawn from models (a small file, loaded when the road opens). Off: every tree is the simple kind.</small>
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
          </Group>
        )}
        {onExportCopy && onImportCopy && (
          <Group title="Your save">
            <small>{savedAt ? `Kept on the server, and copied to this browser at ${new Date(savedAt).toLocaleString()}. If the server loses it, the copy is put back.` : 'Kept on the server. This browser takes a copy after each conversation and puts it back if the server loses it.'}</small>
            <div className="button-row">
              <button type="button" className="secondary-button" onClick={download}>Save to a file</button>
              <label className="secondary-button file-button">Load from a file<input type="file" accept="application/json,.json" onChange={upload} className="sr-only" /></label>
            </div>
            {copyNote && <small role="status">{copyNote}</small>}
            <SaveGuide store={saveStore} serverUrl={settings.serverUrl} />
          </Group>
        )}
        <Group title="Connection" open={!settings.serverUrl && !settings.token}>
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
          </div>
        </Group>
        <Group title="This build" open={outdated}>
          <p className="build-line">
            {outdated && <strong role="status">A newer build is on the site ({newest}). </strong>}
            {describeViewport(site.viewport(), site.build)}
          </p>
          <div className="button-row">
            <button type="button" className={outdated ? 'primary-button' : 'secondary-button'} onClick={() => site.reload()}>Reload the page</button>
          </div>
        </Group>
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={onClose}>Close</button>
        </div>
      </form>
    </div>
  );
}
