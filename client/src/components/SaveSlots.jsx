// Round 178: the save slots: up to three games in this browser, each its own learner and save. The one in use is
// marked; another is played by switching to it (the page reloads into it), and an empty one starts a new game.
// Round 179: any game can be deleted (its save goes from the server too); the one in use is started over instead.
// Round 180: each game has its language. A new game, or the one started over, is played in the language picked here,
// from those the server plays.
import { useState } from 'react';

const savedLine = (entry, nameOf) => {
  if (!entry.used) return 'Empty';
  const parts = [];
  if (entry.language) parts.push(nameOf(entry.language));
  if (entry.conversations !== null) parts.push(`${entry.conversations} conversation${entry.conversations === 1 ? '' : 's'}`);
  if (entry.words !== null) parts.push(`${entry.words} word${entry.words === 1 ? '' : 's'}`);
  if (entry.savedAt) parts.push(`saved ${new Date(entry.savedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`);
  return parts.length ? parts.join(' · ') : 'A game';
};

export default function SaveSlots({ slots, languages = null, onSwitch, onDelete, onClose }) {
  const [confirming, setConfirming] = useState(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);
  const choices = Array.isArray(languages) && languages.length > 1 ? languages : null;
  const nameOf = (code) => languages?.find((entry) => entry.code === code)?.name ?? code;
  const [picked, setPicked] = useState({}); // slot → the language picked for its new game
  // A game started over keeps its language unless another is picked; an empty slot's starts in the server's first.
  const languageOf = (slot) => picked[slot] ?? slots.find((entry) => entry.slot === slot)?.language ?? choices?.[0]?.code ?? null;
  const picker = (slot) => choices && (
    <select className="slot-language" aria-label={`Language for slot ${slot}`} value={languageOf(slot)} disabled={busy}
      onChange={(event) => setPicked({ ...picked, [slot]: event.target.value })}>
      {choices.map((entry) => <option key={entry.code} value={entry.code}>{entry.name}</option>)}
    </select>
  );
  const remove = async (slot, current) => {
    setConfirming(null);
    setBusy(true);
    const result = await onDelete(slot, current && choices ? languageOf(slot) : null);
    if (result?.reloading) return; // the page reloads into a new game in this slot
    setBusy(false);
    setNote(result?.serverDeleted === false
      ? `Slot ${slot} is empty. The server could not be reached, so its copy of that game was left there, out of reach.`
      : `Slot ${slot} was deleted.`);
  };
  return (
    <div className="sheet-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="settings-sheet save-slots" role="dialog" aria-modal="true" aria-labelledby="slots-title">
        <h2 id="slots-title">Save slots</h2>
        <small>Three games in this browser, each with its own progress. Switching reloads the page into that slot.</small>
        <ul className="slot-list">
          {slots.map((entry) => (
            <li key={entry.slot} className={entry.current ? 'slot current' : 'slot'} aria-label={`Slot ${entry.slot}`}>
              <div className="slot-text"><strong>Slot {entry.slot}{entry.current ? ' (playing)' : ''}</strong><small>{savedLine(entry, nameOf)}</small></div>
              <div className="slot-actions">
                {!entry.current && !entry.used && picker(entry.slot)}
                {!entry.current && <button type="button" className="secondary-button" disabled={busy} onClick={() => onSwitch(entry.slot, entry.used ? null : (choices ? languageOf(entry.slot) : null))}>{entry.used ? 'Play' : 'New game'}</button>}
                {entry.current && confirming === entry.slot && picker(entry.slot)}
                {entry.used && (confirming === entry.slot
                  ? <button type="button" className="secondary-button danger" disabled={busy} onClick={() => remove(entry.slot, entry.current)}>{entry.current ? 'Really start over' : 'Really delete'}</button>
                  : <button type="button" className="secondary-button" disabled={busy} onClick={() => setConfirming(entry.slot)}>{entry.current ? 'Start over' : 'Delete'}</button>)}
              </div>
              {confirming === entry.slot && <small className="slot-warning">{entry.current
                ? 'This deletes this game\'s progress for good and starts a new game in this slot.'
                : `This deletes the game in slot ${entry.slot} for good.`}</small>}
            </li>
          ))}
        </ul>
        {note && <small role="status">{note}</small>}
        <div className="button-row"><button type="button" className="secondary-button" onClick={onClose}>Close</button></div>
      </section>
    </div>
  );
}
