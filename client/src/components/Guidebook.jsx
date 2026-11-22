import Narration from './Narration.jsx';

// Round 157 (issue #5): the guidebook. Its entries are pieces of narration the player keeps: each is entered the
// first time what it speaks of happens, and can be read here at any time. `guidebook` is the server's
// { entries: [{ id, title, segments, at, unread }], total, fragments }, or null while it is being read.
// Round 158 (issue #4): `fragments` are the passages the player has met that hold an untranslatable text, kept so
// that they can be read again when more of the language is known.
export default function Guidebook({ guidebook, onReturn, returnLabel = 'Back' }) {
  const entries = guidebook?.entries ?? [];
  const fragments = guidebook?.fragments ?? [];
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
      {fragments.length > 0 && (
        <section className="guide-fragments" aria-label="Turmeric text you have found">
          <h3>Turmeric text you have found</h3>
          <p><small>Nothing translates these. Come back to them when you know more.</small></p>
          <ol className="guide-list">
            {fragments.map((fragment) => <li key={fragment.id} className="guide-entry"><Narration narration={fragment} /></li>)}
          </ol>
        </section>
      )}
    </main>
  );
}

/**
 * Where the narrator speaks (a card of a place): the entries entered last and not yet read, told in place. Each
 * entry is told this way when it is entered; older ones still unread are only counted (round 158: a player who never
 * opens the guidebook would otherwise have a card longer than the screen).
 */
export function GuideNote({ note, onOpen }) {
  const unread = note?.unread ?? [];
  if (!unread.length) return null;
  const newest = unread.reduce((latest, entry) => (entry.at > latest ? entry.at : latest), '');
  const told = unread.filter((entry) => entry.at === newest);
  const waiting = unread.length - told.length;
  return (
    <aside className="guide-note" aria-label="Entered in your guidebook">
      {told.map((entry) => (
        <div key={entry.id}>
          <strong>{entry.title}</strong>
          <Narration narration={entry} />
        </div>
      ))}
      <small>Entered in your guidebook{waiting > 0 ? `, where ${waiting} more ${waiting === 1 ? 'entry waits' : 'entries wait'} unread` : ''}. {onOpen && <button type="button" className="text-button" onClick={onOpen}>Open it</button>}</small>
    </aside>
  );
}
