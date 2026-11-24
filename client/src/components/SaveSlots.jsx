// Round 178: the save slots: up to three games in this browser, each its own learner and save. The one in use is
// marked; another is played by switching to it (the page reloads into it), and an empty one starts a new game.
// Round 179: any game can be deleted (its save goes from the server too); the one in use is started over instead.
import { useState } from 'react';

const savedLine = (entry) => {
  if (!entry.used) return 'Empty';
  const parts = [];
  if (entry.conversations !== null) parts.push(`${entry.conversations} conversation${entry.conversations === 1 ? '' : 's'}`);
  if (entry.words !== null) parts.push(`${entry.words} word${entry.words === 1 ? '' : 's'}`);
  if (entry.savedAt) parts.push(`saved ${new Date(entry.savedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`);
  return parts.length ? parts.join(' · ') : 'A game';
};

export default function SaveSlots({ slots, onSwitch, onDelete, onClose }) {
  const [confirming, setConfirming] = useState(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);
  const remove = async (slot, current) => {
    setConfirming(null);
    setBusy(true);
    const result = await onDelete(slot);
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
              <div className="slot-text"><strong>Slot {entry.slot}{entry.current ? ' (playing)' : ''}</strong><small>{savedLine(entry)}</small></div>
              <div className="slot-actions">
                {!entry.current && <button type="button" className="secondary-button" disabled={busy} onClick={() => onSwitch(entry.slot)}>{entry.used ? 'Play' : 'New game'}</button>}
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
