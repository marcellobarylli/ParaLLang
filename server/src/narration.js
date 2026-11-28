// Round 156 (issue #6): the narrator's own passages. Beside the narration a model writes for each line of a
// conversation, the narrator has passages that are written down (content/narration/passages.yaml) and told when
// something happens: the player sets out, arrives somewhere, comes to a site of a dungeon. These functions are pure:
// which passage an event gets, and a passage as the client is sent it.
//
// A passage is { id, when, once?, text }. `when` names the event and what must be true of it; an event is
// { event, ...facts }. A passage is sent as { id, segments }, and a segment is { text } or { text, kind }: a
// segment with a kind is set apart on the screen. Round 156 has no kinds; they are the hook for the spans a later
// round adds (issue #4), as `told` in the save is the hook for the guidebook (issue #5).

/** Whether every fact a passage asks for is true of the event. */
export function matches(passage, event) {
  return Object.entries(passage.when).every(([key, value]) => event[key] === value);
}

/**
 * The passage an event gets, or null.
 *
 *   told   the passages already told to this learner ({ id: when })
 *   pick   a number in [0, 1) that chooses among equals (a hash of the place, so a place keeps its passage)
 *
 * A passage marked `once` that has not been told comes first, in the file's order. Otherwise the passages that ask
 * for the most facts win (an arrival by ferry in a forest before any arrival), and `pick` chooses among those.
 */
export function selectPassage(passages, event, { told = {}, pick = 0 } = {}) {
  // Round 158: a passage may wait for a number of conversations finished on the road (`min_step`).
  // Round 163: or for a journey of a number of walks (`min_hops`).
  const fitting = passages.filter((passage) => matches(passage, event)
    && (passage.min_step === undefined || (event.step ?? 0) >= passage.min_step)
    && (passage.min_hops === undefined || (event.hops ?? 0) >= passage.min_hops));
  const first = fitting.find((passage) => passage.once && !Object.hasOwn(told, passage.id));
  if (first) return first;
  const lasting = fitting.filter((passage) => !passage.once);
  if (!lasting.length) return null;
  // Round 160: a passage that asks for a dungeon is more particular than any that does not.
  const weight = (passage) => Object.keys(passage.when).length + ('dungeon' in passage.when ? 10 : 0);
  const most = Math.max(...lasting.map(weight));
  const best = lasting.filter((passage) => weight(passage) === most);
  return best[Math.min(best.length - 1, Math.floor(Math.max(0, pick) * best.length))];
}

/**
 * Round 157 (issue #5): the guidebook entries an event enters: those that fit it and that the learner does not have
 * yet (`have` is the save's { id: … }), in the file's order.
 */
export function entriesFor(entries, event, have = {}) {
  return entries.filter((entry) => matches(entry, event) && !Object.hasOwn(have, entry.id));
}

// Round 213: the events that the page tells of itself, because they happen there and the server never sees them. An
// entry entered by one is told by the page at that moment (and so is entered as read); until then every view carries
// it, so that the page has its words when the moment comes.
//   breath_wait   the first answer sent with the breathing on: the breath that takes the place of the wait
export const CLIENT_EVENTS = Object.freeze(['breath_wait']);

// Round 158 (issue #4): `{truth:<id>}` in a text is one of the pack's untranslatable texts.
export const TRUTH = /\{truth:([a-z][a-z0-9_]*)\}/g;
/** The ids of the untranslatable texts a passage's text holds. */
export function truthIds(text) { return [...String(text).matchAll(TRUTH)].map((match) => match[1]); }

/**
 * A passage's text as segments: plain ones ({ text }) and, for each `{truth:<id>}`, the pack's untranslatable text
 * ({ text, kind: 'truth', lang }). `pack` is { truths: Map(id -> { text }), lang }; a text the pack does not have is
 * left out (the loader refuses such a pack, so this is for a caller with no pack).
 */
export function toSegments(text, pack = null) {
  const tidy = (part) => part.replace(/\s+/g, ' ');
  const source = String(text).trim();
  const segments = [];
  let last = 0;
  for (const match of source.matchAll(TRUTH)) {
    if (match.index > last) segments.push({ text: tidy(source.slice(last, match.index)) });
    const truth = pack?.truths?.get(match[1]);
    if (truth) segments.push({ text: truth.text, kind: 'truth', ...(pack.lang ? { lang: pack.lang } : {}) });
    last = match.index + match[0].length;
  }
  if (last < source.length) segments.push({ text: tidy(source.slice(last)) });
  return segments.filter((segment) => segment.text.trim() !== '');
}

export function passageView(passage, pack = null) {
  return passage ? { id: passage.id, segments: toSegments(passage.text, pack) } : null;
}
