import { useState } from 'react';
import { PANEL_OPACITY, clampPanelOpacity } from '../display.js';

// Round 114: the server URL and the access token (PARALLANG_TOKEN on the server). Both stay in this browser's
// localStorage; the token is sent as X-ParaLLang-Token. A blank URL means this page's own /api (the dev proxy).
// Round 117: the opacity of the text panels over the level. The slider applies at once and needs no save; the sheet
// takes the same background, so it shows the result while the slider moves.
export default function SettingsSheet({ settings, onSave, onClose, panelOpacity = PANEL_OPACITY.default, onPanelOpacity }) {
  const [serverUrl, setServerUrl] = useState(settings.serverUrl);
  const [token, setToken] = useState(settings.token);
  const submit = (event) => {
    event.preventDefault();
    onSave({ serverUrl, token });
  };
  const percent = Math.round(clampPanelOpacity(panelOpacity) * 100);
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
      </form>
    </div>
  );
}
