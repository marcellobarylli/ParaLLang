import { useEffect, useRef, useState } from 'react';
import BilingualText from './BilingualText.jsx';
import NarrativeText from './NarrativeText.jsx';

// Round 115: the conversation of the dungeon's current site. The character's name comes from the encounter (the
// old screen named Gerald). The sheet around it scrolls.
// Round 126: with `onSpeak`, each of the character's lines has a 🔊 that reads it aloud in the character's voice.
// Round 129: in beginner mode the objective card shows the conversation's hearts.
// Round 132: the objective box is no longer pinned. It stands after the character's opening line, where the player
// should answer, then the tutorial's briefing, then the rest of the conversation. When the box has been scrolled
// out of the top of the text, a one-line bar is pinned there: a tap unfolds the objectives, another folds them.

const ordinal = (n) => ({ 1: 'first', 2: 'second', 3: 'third', 4: 'fourth', 5: 'fifth' })[n] ?? `${n}th`;

// What the box and the unfolded bar both show: the objectives open now.
function ObjectiveContent({ encounter, language, beginner, light }) {
  const open = encounter.openObjectives ?? [];
  const name = encounter.character?.name?.split(' ')[0] ?? 'them';
  return (
    <>
      {/* Round 131: every objective still open, since one answer of a paragraph may meet several. */}
      {!encounter.currentObjective && encounter.state !== 'ongoing' && <strong>Conversation complete</strong>}
      {/* Round 154: a light exchange goes on to its third turn even when everything asked for has been said. */}
      {!encounter.currentObjective && encounter.state === 'ongoing' && <><strong>Keep talking</strong><p>You have said everything {name} needed. The conversation goes on a little: answer, or ask {name} something.</p></>}
      {encounter.currentObjective && !(open.length > 1) && <><strong>Current objective</strong><p>{encounter.currentObjective.prompt}</p></>}
      {encounter.currentObjective && open.length > 1 && (
        <>
          <strong>In your answer</strong>
          <ol className="objective-list">{open.map((objective) => <li key={objective.id}>{objective.prompt}</li>)}</ol>
          <small className="objective-advice">Answer in a few sentences, and do as many of these as you can in one go.</small>
        </>
      )}
      <small>{language?.name ?? 'Target-language'} target: {Math.round(encounter.difficulty * 100)}% · Hints: {encounter.hints.remaining}/{encounter.hints.limit}</small>
      {/* Round 153: light mode marks nothing, so it has no hearts. */}
      {light && encounter.state === 'ongoing' && (
        <small className="light-note">
          Light mode: nothing is marked. Say it as well as you can, in {language?.name ?? 'the language'} or in English.
          {encounter.exchange && !encounter.exchange.limit && <> Turn {Math.min(encounter.exchange.max, encounter.exchange.turn + 1)} of {encounter.exchange.min} to {encounter.exchange.max}.</>} You can ask {name} questions back.
        </small>
      )}
      {/* Round 174: the conversation is complete on the player's third reply. */}
      {encounter.state === 'ongoing' && encounter.exchange?.limit && (
        <small className="exchange-count">Reply {Math.min(encounter.exchange.limit, encounter.exchange.turn + 1)} of {encounter.exchange.limit}. The conversation is complete after your {ordinal(encounter.exchange.limit)} reply.</small>
      )}
      {beginner && !light && encounter.hearts && (
        <small className="hearts" aria-label={`${encounter.hearts.limit - encounter.hearts.used} of ${encounter.hearts.limit} hearts left`}>
          {'♥'.repeat(Math.max(0, encounter.hearts.limit - encounter.hearts.used))}{'♡'.repeat(Math.min(encounter.hearts.limit, encounter.hearts.used))}
        </small>
      )}
    </>
  );
}

// True while `element` has been scrolled out of the top of the scrolling text around it. It is measured, on every
// scroll and after every change of the conversation: an observer of crossings misses the jump to the end of the text
// that follows each turn, which takes the box from below the view to above it without its ever being in view. The
// element is passed itself, not a ref: the box is not there while the conversation is still being prepared.
export const BAR_ROOM = 44; // pixels at the top of the text where the bar goes: a box with only that much showing is past
function useScrolledPast(element, changes) {
  const [past, setPast] = useState(false);
  const measure = useRef(() => {});
  useEffect(() => {
    const root = element?.closest?.('.sheet-scroll');
    if (!element || !root) { measure.current = () => {}; setPast(false); return undefined; }
    measure.current = () => {
      // A text with no height has no layout to measure (a hidden panel, a test without a browser).
      if (!(root.clientHeight > 0)) { setPast(false); return; }
      setPast(element.getBoundingClientRect().bottom <= root.getBoundingClientRect().top + BAR_ROOM);
    };
    measure.current();
    root.addEventListener('scroll', measure.current, { passive: true });
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => measure.current()) : null;
    observer?.observe(root);
    return () => { root.removeEventListener('scroll', measure.current); observer?.disconnect(); };
  }, [element]);
  // After the sheet has scrolled for the change (the sheet's own effect runs after this one), measure again.
  useEffect(() => {
    const frame = typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => measure.current()) : null;
    measure.current();
    return () => { if (frame !== null) cancelAnimationFrame(frame); };
  }, [changes]);
  return past;
}

// Round 198: `afterAnswer` (what was understood of the player's last answer, and its correction) stands directly under
// that answer, so the character's reply to it is the last thing before the box the player writes in.
export default function DialoguePanel({ encounter, language, isLoading, onHelp, onSpeak = null, onSayWord = null, beginner = false, light = false, afterAnswer = null }) {
  const [box, setBox] = useState(null);
  const past = useScrolledPast(box, `${encounter?.id}:${encounter?.version}:${encounter?.transcript?.length}:${isLoading}`);
  const [unfolded, setUnfolded] = useState(false);
  useEffect(() => { if (!past) setUnfolded(false); }, [past]); // it starts folded each time it appears
  if (!encounter) return <main className="dialogue-panel"><p>Preparing the conversation…</p></main>;
  const name = encounter.character?.name ?? 'them';
  const briefing = encounter.companionBriefing ?? [];
  const todo = encounter.currentObjective ? Math.max(1, encounter.openObjectives?.length ?? 1) : 0;
  const line = (message) => (message.role === 'npc' ? (
    <article className="npc-message" key={message.id}>
      <NarrativeText narrative={message.narrative} words={message.narrativeWords} language={language} onSay={onSayWord} />
      <div className="speaker-row">
        <strong className="speaker">{message.dialogue.speaker}</strong>
        {onSpeak && <button type="button" className="icon-button speak-button" onClick={() => onSpeak(message)} aria-label={`Hear ${message.dialogue.speaker} say this line`} title="Hear this line">🔊</button>}
      </div>
      <BilingualText message={message} language={language} onHelp={onHelp} disabled={isLoading || (message.protected && !encounter.hints_available)} />
    </article>
  ) : (
    <p className="player-message" key={message.id}>{message.text}</p>
  ));
  const [opening, ...rest] = encounter.transcript;
  const lastAnswer = rest.findLast((message) => message.role !== 'npc')?.id ?? null;
  return (
    <main className="dialogue-panel" aria-label={`Conversation with ${name}`}>
      {/* A holder with no height, pinned to the top of the text: the bar shows and hides without moving the text. */}
      <div className="objective-pin">
        {past && (
          <div className={`objective-bar${unfolded ? ' unfolded' : ''}`}>
            <button type="button" className="objective-toggle" aria-expanded={unfolded} onClick={() => setUnfolded(!unfolded)}>
              <span>Objective</span>
              <small>{todo === 0 ? (encounter.state === 'ongoing' ? 'keep talking' : 'complete') : `${todo} to do`}</small>
              <span aria-hidden="true">{unfolded ? '▴' : '▾'}</span>
            </button>
            {unfolded && <div className="objective-card objective-unfolded"><ObjectiveContent encounter={encounter} language={language} beginner={beginner} light={light} /></div>}
          </div>
        )}
      </div>
      {opening && line(opening)}
      <section className="objective-card" aria-live="polite" ref={setBox}>
        <ObjectiveContent encounter={encounter} language={language} beginner={beginner} light={light} />
      </section>
      {briefing.length > 0 && encounter.committedPlayerTurns === 0 && (
        <aside className="briefing-card" aria-label="Your companion's briefing">
          <strong>Your companion</strong>
          {briefing.map((text) => <p key={text}>{text}</p>)}
        </aside>
      )}
      {rest.map((message) => (message.id === lastAnswer && afterAnswer ? [line(message), <div className="after-answer" key="after-answer">{afterAnswer}</div>] : line(message)))}
      {lastAnswer === null && afterAnswer}
      {isLoading && <p className="thinking" role="status">{name} is considering the linguistic implications…</p>}
    </main>
  );
}
