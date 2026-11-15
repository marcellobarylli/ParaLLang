const DAY_MS = 86_400_000;

// Round 054 (backlog F2): an iPhone types ’ (Smart Punctuation). Every apostrophe look-alike becomes ', one UTF-16
// unit for one, so offsets into the source do not move. Before NFKC, which would split ´ into a space and an accent.
const APOSTROPHES = /[\u2019\u2018\u02BC\u0060\u00B4\u2032]/gu;
export function foldApostrophes(text) { return String(text ?? '').replace(APOSTROPHES, "'"); }

// Round 054 (critique 1.3): the grader-evidence presence check compares texts folded alike: apostrophes, NFC, every
// whitespace run (no-break space included) to one space, case.
export function foldEvidenceText(text) {
  return foldApostrophes(text).normalize('NFC').replace(/\s+/gu, ' ').toLowerCase();
}

export function normalizeAnswer(value, { stripAccents = false } = {}) {
  let normalized = foldApostrophes(value)
    .normalize('NFKC')
    .toLocaleLowerCase('en')
    .replace(/[.,!?;¿¡:"'()“”‘’]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
  if (stripAccents) normalized = normalized.normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC');
  return normalized;
}

function levenshtein(a, b) {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const saved = previous[j];
      previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = saved;
    }
  }
  return previous[b.length];
}

export function gradeVocabularyAnswer(entry, answer) {
  const normalized = normalizeAnswer(answer);
  if (!normalized) return { correct: false, quality: 2, match: null, kind: 'incorrect' };
  for (const accepted of entry.accepted_translations) {
    const candidate = normalizeAnswer(accepted);
    if (normalized === candidate) return { correct: true, quality: 5, match: accepted, kind: 'exact' };
  }
  const isSingleWord = !normalized.includes(' ');
  if (isSingleWord && normalized.length >= 5) {
    for (const accepted of entry.accepted_translations) {
      const candidate = normalizeAnswer(accepted);
      if (!candidate.includes(' ') && candidate.length >= 5 && levenshtein(normalized, candidate) === 1) {
        return { correct: true, quality: 3, match: accepted, kind: 'minor_typo' };
      }
    }
  }
  return { correct: false, quality: 2, match: null, kind: 'incorrect' };
}

function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

export function matchCanonicalVocabulary(text, vocabulary) {
  const source = String(text ?? '');
  // Round 052 (critique 1.4): fold cluster by cluster (a base character with its combining marks) and keep each
  // folded unit's source span, so offsets and excerpts index the source even when it holds decomposed accents.
  let folded = '';
  const startOf = [];
  const endOf = [];
  for (const cluster of source.matchAll(/\P{M}\p{M}*|\p{M}+/gsu)) {
    const piece = foldApostrophes(cluster[0].normalize('NFD').replace(/\p{M}/gu, '').toLowerCase());
    for (let i = 0; i < piece.length; i += 1) {
      startOf.push(cluster.index);
      endOf.push(cluster.index + cluster[0].length);
    }
    folded += piece;
  }
  // Round 058 (critique 1.2): every (entry, variant) pair, longest folded form first across all entries (a stable sort:
  // ties keep load order), so no entry's short variant takes a span a longer form of another entry would match.
  const pairs = [...vocabulary]
    .flatMap((entry) => entry.surface_variants.map((variant) => ({ entry, form: foldApostrophes(variant.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()) })))
    .sort((a, b) => b.form.length - a.form.length);
  const occupied = [];
  const matches = [];
  for (const { entry, form } of pairs) {
    const pattern = escapeRegExp(form).replace(/\s+/g, '\\s+');
    const expression = new RegExp(`(?<![\\p{L}\\p{N}_])${pattern}(?![\\p{L}\\p{N}_])`, 'gu');
    for (const result of folded.matchAll(expression)) {
      const start = startOf[result.index];
      const end = endOf[result.index + result[0].length - 1];
      if (occupied.some(([usedStart, usedEnd]) => start < usedEnd && end > usedStart)) continue;
      occupied.push([start, end]);
      matches.push({ id: entry.id, entry, excerpt: source.slice(start, end), start, end });
    }
  }
  return matches.sort((a, b) => a.start - b.start);
}

// Round 078 (prototype.md §11, "checks the ratio and retries"): a line with no target language at all. Every folded
// word of `native` occurs in `translation`, and no vocabulary entry of the encounter matches `native`. Lines under four
// words are not flagged (critique 1.1: "No, Sam." is valid Italian and Spanish). A heuristic for one failure kind: an
// English line that rewords its translation is not caught (critique 1.2).
export const TARGET_CHECK_MIN_WORDS = 4;
function foldedWords(text) {
  return normalizeAnswer(text, { stripAccents: true }).split(/[^\p{L}\p{N}']+/u).filter(Boolean);
}
export function lacksTargetLanguage(native, translation, vocabulary) {
  const words = foldedWords(native);
  if (words.length < TARGET_CHECK_MIN_WORDS) return false;
  const translated = new Set(foldedWords(translation));
  if (!words.every((word) => translated.has(word))) return false;
  return matchCanonicalVocabulary(native, vocabulary).length === 0;
}

// Round 058 (backlog F3): every variant of every entry, read alone, must be matched as that entry, whole. Returns the
// failures (an equal folded form in another entry, or a form taken by another entry's).
export function vocabularyFormConflicts(entries) {
  return entries.flatMap((entry) => entry.surface_variants.flatMap((variant) => {
    const got = matchCanonicalVocabulary(variant, entries);
    const whole = got.length === 1 && got[0].id === entry.id && got[0].start === 0 && got[0].end === variant.length;
    return whole ? [] : [{ id: entry.id, variant, got: got.map((match) => match.id) }];
  }));
}

export function calculateTargetRatio(base, increment, committedPlayerTurns) {
  return Math.min(1, base + increment * committedPlayerTurns);
}

// Round 121: experience and levels. The level is derived from the XP, never stored: level L starts at
// 10 × (L − 1) × (L + 4) XP, so levels 1 to 6 start at 0, 60, 140, 240, 360 and 500.
export const levelStartsAt = (level) => 10 * (level - 1) * (level + 4);
export function levelFor(xp) {
  let level = 1;
  while (levelStartsAt(level + 1) <= xp) level += 1;
  return level;
}
export function progressionView(xp) {
  const level = levelFor(xp);
  return { xp, level, levelStartsAt: levelStartsAt(level), nextLevelAt: levelStartsAt(level + 1) };
}
// Each level above the first adds this much to a conversation's base target ratio (the owner: a replay at a higher
// level is harder). Rounded to a hundredth, so a session and its prompt carry 0.06, not 0.06000000000000001.
export const RATIO_PER_LEVEL = 0.03;
export const ratioBonusFor = (level) => Math.round(RATIO_PER_LEVEL * (Math.max(1, level) - 1) * 100) / 100;

export function initialSchedule(now) {
  const timestamp = new Date(now).toISOString();
  return { ease: 2.5, repetitions: 0, intervalDays: 0, dueAt: timestamp, lastReviewedAt: null, lastQuality: null };
}

export function scheduleReview(schedule, quality, now) {
  const q = Math.max(0, Math.min(5, Math.trunc(quality)));
  const previousEase = schedule.ease ?? 2.5;
  let repetitions;
  let intervalDays;
  if (q < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    repetitions = (schedule.repetitions ?? 0) + 1;
    if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = 6;
    else intervalDays = Math.max(1, Math.round((schedule.intervalDays || 1) * previousEase));
  }
  const difference = 5 - q;
  const ease = Math.max(1.3, previousEase + 0.1 - difference * (0.08 + difference * 0.02));
  const reviewedAt = new Date(now);
  return {
    ease: Number(ease.toFixed(5)), repetitions, intervalDays,
    dueAt: new Date(reviewedAt.getTime() + intervalDays * DAY_MS).toISOString(),
    lastReviewedAt: reviewedAt.toISOString(), lastQuality: q,
  };
}

export function isDue(schedule, now) { return new Date(schedule.dueAt).getTime() <= new Date(now).getTime(); }
export function capAssistedQuality(quality, assisted) { return assisted ? Math.min(2, quality) : quality; }
export function masteryLabel(schedule) {
  if (!schedule.lastReviewedAt) return 'discovered';
  if (schedule.repetitions >= 3) return 'mastered';
  if (schedule.repetitions >= 1) return 'learning';
  return 'relearning';
}
export { DAY_MS };
