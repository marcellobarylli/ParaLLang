import { useEffect, useState } from 'react';
import { PANEL_OPACITY, clampPanelOpacity } from '../display.js';
import { BUILD_ID } from '../build.js';
import { describeViewport, latestBuild, measureViewport, reloadPage } from '../viewport.js';

// Round 118: which build runs, what the browser reports about its viewport (so a screenshot of Settings carries
// both), whether the site holds a newer build, and a reload that goes past the browser's cache.
const SITE = { build: BUILD_ID, latestBuild, reload: reloadPage, viewport: measureViewport };

// Round 114: the server URL and the access token (PARALLANG_TOKEN on the server). Both stay in this browser's
// localStorage; the token is sent as X-ParaLLang-Token. A blank URL means this page's own /api (the dev proxy).
// Round 117: the opacity of the text panels over the level. The slider applies at once and needs no save; the sheet
// takes the same background, so it shows the result while the slider moves.
export default function SettingsSheet({ settings, onSave, onClose, panelOpacity = PANEL_OPACITY.default, onPanelOpacity, site = SITE }) {
  const [serverUrl, setServerUrl] = useState(settings.serverUrl);
  const [token, setToken] = useState(settings.token);
  const submit = (event) => {
    event.preventDefault();
    onSave({ serverUrl, token });
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
