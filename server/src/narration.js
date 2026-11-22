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
  const fitting = passages.filter((passage) => matches(passage, event));
  const first = fitting.find((passage) => passage.once && !Object.hasOwn(told, passage.id));
  if (first) return first;
  const lasting = fitting.filter((passage) => !passage.once);
  if (!lasting.length) return null;
  const most = Math.max(...lasting.map((passage) => Object.keys(passage.when).length));
  const best = lasting.filter((passage) => Object.keys(passage.when).length === most);
  return best[Math.min(best.length - 1, Math.floor(Math.max(0, pick) * best.length))];
}

/**
 * Round 157 (issue #5): the guidebook entries an event enters: those that fit it and that the learner does not have
 * yet (`have` is the save's { id: … }), in the file's order.
 */
export function entriesFor(entries, event, have = {}) {
  return entries.filter((entry) => matches(entry, event) && !Object.hasOwn(have, entry.id));
}

/** A passage's text as segments. Round 156: one plain segment. */
export function toSegments(text) {
  return [{ text: String(text).trim().replace(/\s+/g, ' ') }];
}

export function passageView(passage) {
  return passage ? { id: passage.id, segments: toSegments(passage.text) } : null;
}
