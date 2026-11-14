import { useState } from 'react';

// Round 114: the server URL and the access token (PARALLANG_TOKEN on the server). Both stay in this browser's
// localStorage; the token is sent as X-ParaLLang-Token. A blank URL means this page's own /api (the dev proxy).
export default function SettingsSheet({ settings, onSave, onClose }) {
  const [serverUrl, setServerUrl] = useState(settings.serverUrl);
  const [token, setToken] = useState(settings.token);
  const submit = (event) => {
    event.preventDefault();
    onSave({ serverUrl, token });
  };
  return (
    <div className="sheet-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form className="settings-sheet" role="dialog" aria-modal="true" aria-labelledby="settings-title" onSubmit={submit}>
        <h2 id="settings-title">Settings</h2>
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
          <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
