// Round 178: the save slots: up to three games in this browser, each its own learner and save. The one in use is
// marked; another is played by switching to it (the page reloads into it), and an empty one starts a new game.
import { useState } from 'react';

const savedLine = (entry) => {
  if (!entry.used) return 'Empty';
  const parts = [];
  if (entry.conversations !== null) parts.push(`${entry.conversations} conversation${entry.conversations === 1 ? '' : 's'}`);
  if (entry.words !== null) parts.push(`${entry.words} word${entry.words === 1 ? '' : 's'}`);
  if (entry.savedAt) parts.push(`saved ${new Date(entry.savedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`);
  return parts.length ? parts.join(' · ') : 'A game';
};

export default function SaveSlots({ slots, onSwitch, onClear, onClose }) {
  const [confirming, setConfirming] = useState(null);
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
                {!entry.current && <button type="button" className="secondary-button" onClick={() => onSwitch(entry.slot)}>{entry.used ? 'Play' : 'New game'}</button>}
                {!entry.current && entry.used && (confirming === entry.slot
                  ? <button type="button" className="secondary-button danger" onClick={() => { setConfirming(null); onClear(entry.slot); }}>Really empty it</button>
                  : <button type="button" className="secondary-button" onClick={() => setConfirming(entry.slot)}>Empty</button>)}
              </div>
            </li>
          ))}
        </ul>
        <div className="button-row"><button type="button" className="secondary-button" onClick={onClose}>Close</button></div>
      </section>
    </div>
  );
}
