const DAY_MS = 86_400_000;

export function normalizeAnswer(value, { stripAccents = false } = {}) {
  let normalized = String(value ?? '')
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
  const folded = source.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es');
  const entries = [...vocabulary].sort((a, b) => {
    const longestA = Math.max(...a.surface_variants.map((form) => form.length));
    const longestB = Math.max(...b.surface_variants.map((form) => form.length));
    return longestB - longestA;
  });
  const occupied = [];
  const matches = [];
  for (const entry of entries) {
    const variants = [...entry.surface_variants].sort((a, b) => b.length - a.length);
    for (const variant of variants) {
      const form = variant.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es');
      const pattern = escapeRegExp(form).replace(/\s+/g, '\\s+');
      const expression = new RegExp(`(?<![\\p{L}\\p{N}_])${pattern}(?![\\p{L}\\p{N}_])`, 'gu');
      for (const result of folded.matchAll(expression)) {
        const start = result.index;
        const end = start + result[0].length;
        if (occupied.some(([usedStart, usedEnd]) => start < usedEnd && end > usedStart)) continue;
        occupied.push([start, end]);
        matches.push({ id: entry.id, entry, excerpt: source.slice(start, end), start, end });
      }
    }
  }
  return matches.sort((a, b) => a.start - b.start);
}

export function calculateSpanishRatio(base, increment, committedPlayerTurns) {
  return Math.min(1, base + increment * committedPlayerTurns);
}

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
