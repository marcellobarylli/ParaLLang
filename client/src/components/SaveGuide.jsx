import { useState } from 'react';

// Round 146: the guide to the GitHub save (round 145), in the app itself. It stands beside "Your save" in Settings:
// one line that says where the server keeps its saves now (from the server's health check), and a button that
// opens the steps to switch the GitHub save on. The steps are for whoever runs the server; they need no chat log.

/** One line on where the server keeps its saves, from `store` (the health check's `saves`, or null when unknown). */
export function saveStoreLine(store) {
  if (!store) return 'Where the server keeps its saves could not be read (it may be asleep, or older than this page).';
  if (store.kind === 'github') {
    if (store.lastWriteOk === false) return 'The server writes its saves to GitHub, but the last write failed. It tries again with the next save; check the token if this stays.';
    return `The server writes its saves to GitHub${store.lastWriteAt ? ` (last written ${new Date(store.lastWriteAt).toLocaleString()})` : ' (nothing written since its last start yet)'}. A restart of the server loses nothing.`;
  }
  return `The server keeps its saves on its own disk only${store.problem ? `, because its GitHub settings are wrong: ${store.problem}` : ''}. On the free hosting plan a restart of the server loses them; this browser's copy is then the only spare.`;
}

export default function SaveGuide({ store = null, serverUrl = '' }) {
  const [open, setOpen] = useState(false);
  const health = `${serverUrl || ''}/api/health`;
  return (
    <div className="save-guide">
      <small className={store?.kind === 'github' && store.lastWriteOk !== false ? 'store-line store-safe' : 'store-line'} role="status">{saveStoreLine(store)}</small>
      <button type="button" className="secondary-button" aria-expanded={open} aria-controls="save-guide-steps" onClick={() => setOpen(!open)}>
        {open ? 'Close the guide' : 'Guide: keep the saves on GitHub'}
      </button>
      {open && (
        <section id="save-guide-steps" className="guide-steps" aria-label="How to keep the saves on GitHub">
          <p><strong>What this does.</strong> The server writes every save to a GitHub repository as a small JSON file and reads it back when it has lost its own copy. The file begins with where you are in the curriculum. It needs one token, made once by whoever runs the server.</p>
          <ol>
            <li>
              <strong>Make a token on GitHub.</strong> Your picture (top right) → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.
              <ul>
                <li>Repository access: “Only select repositories”, and pick the repository the saves should go to. A private repository keeps your progress to yourself; in a public one anyone can read it (without your id).</li>
                <li>Permissions → Repository permissions → <strong>Contents: Read and write</strong>. Nothing else.</li>
                <li>Generate the token and copy it. GitHub shows it once.</li>
              </ul>
            </li>
            <li>
              <strong>Give it to the server on Render.</strong> Dashboard → the <code>parallang</code> service → Environment (left) → “Add Environment Variable”, twice, then “Save and deploy”. (If there is a “Save only”, it is not enough: the server reads the variables when it starts.)
              <ul>
                <li><code>PARALLANG_GITHUB_TOKEN</code>: the token.</li>
                <li><code>PARALLANG_GITHUB_REPO</code>: the repository, as <code>owner/name</code>.</li>
              </ul>
            </li>
            <li>
              <strong>Check it.</strong> Open Settings again: the line above should say that the server writes its saves to GitHub. Or open <a href={health} target="_blank" rel="noreferrer">the server’s health check</a>: it shows <code>"kind": "github"</code>. If it shows <code>"disk"</code> with a <code>problem</code>, the two variables are not both right, and it says which.
            </li>
            <li>
              <strong>Play one conversation.</strong> About ten seconds later the repository has a branch called <code>saves</code> with a commit such as “save 1a2b3c4d (it): A1, unit 2 of 36 (Where you are from), 4 of 108 lessons”. That line is where you are in the curriculum.
            </li>
          </ol>
          <p><strong>Good to know.</strong> One file per learner, <code>saves/it/&lt;hash&gt;.json</code>. Your learner id is in neither the name nor the file. These commits start no build and no deploy. Optional variables: <code>PARALLANG_GITHUB_BRANCH</code> (default <code>saves</code>, never <code>main</code>) and <code>PARALLANG_GITHUB_DIR</code> (default <code>saves</code>).</p>
          <p>To rotate the token, make a new one and replace the variable on Render. To stop, remove both variables: saves stay on the server’s disk. The same steps are in the repository’s README under “Saves on GitHub”.</p>
        </section>
      )}
    </div>
  );
}
