import Narration from './Narration.jsx';

// Round 157 (issue #5): the guidebook. Its entries are pieces of narration the player keeps: each is entered the
// first time what it speaks of happens, and can be read here at any time. `guidebook` is the server's
// { entries: [{ id, title, segments, at, unread }], total }, or null while it is being read.
export default function Guidebook({ guidebook, onReturn, returnLabel = 'Back' }) {
  const entries = guidebook?.entries ?? [];
  return (
    <main className="guidebook" aria-label="Guidebook">
      <div className="panel-heading">
        <div><h2>Guidebook</h2><p>{guidebook ? `${entries.length} of ${guidebook.total} entries` : 'Opening…'}</p></div>
        <button type="button" className="secondary-button" onClick={onReturn}>{returnLabel}</button>
      </div>
      {guidebook && entries.length === 0 && (
        <section className="empty-state"><h3>Nothing is entered yet</h3><p>The narrator enters a thing here the first time you meet it.</p></section>
      )}
      <ol className="guide-list">
        {entries.map((entry) => (
          <li key={entry.id} className={entry.unread ? 'guide-entry unread' : 'guide-entry'}>
            <h3>{entry.title}{entry.unread && <span className="kind-tag guide-new">New</span>}</h3>
            <Narration narration={entry} />
          </li>
        ))}
      </ol>
    </main>
  );
}

/** Where the narrator speaks (a card of a place): the entries entered and not yet read, told once in place. */
export function GuideNote({ note, onOpen }) {
  const unread = note?.unread ?? [];
  if (!unread.length) return null;
  return (
    <aside className="guide-note" aria-label="Entered in your guidebook">
      {unread.map((entry) => (
        <div key={entry.id}>
          <strong>{entry.title}</strong>
          <Narration narration={entry} />
        </div>
      ))}
      <small>Entered in your guidebook. {onOpen && <button type="button" className="text-button" onClick={onOpen}>Open it</button>}</small>
    </aside>
  );
}
