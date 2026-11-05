// Round 031 (backlog A11): the device's save slots. A slot is a learner id on the server (one JSON save each), so
// the record lives on the device only: { version: 1, activeId, slots: [{ learnerId, label, createdAt }] }.
export const SLOTS_KEY = 'parallang.saveSlots';
export const MAX_SAVES = 3;
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validSlot(slot) {
  return Boolean(slot) && typeof slot === 'object' && ID.test(String(slot.learnerId ?? ''))
    && typeof slot.label === 'string' && slot.label.length > 0 && typeof slot.createdAt === 'string';
}

// Critique 1.7: parsing keeps every valid slot (v4 UUID, label, date; no duplicate; the first MAX_SAVES). Only a
// record that does not parse, or holds no valid slot, counts as missing (the caller falls back to the legacy key).
export function parseSlots(raw) {
  if (!raw) return null;
  let value;
  try { value = JSON.parse(raw); } catch { return null; }
  if (!value || typeof value !== 'object' || !Array.isArray(value.slots)) return null;
  const seen = new Set();
  const slots = value.slots.filter((slot) => validSlot(slot) && !seen.has(slot.learnerId) && seen.add(slot.learnerId))
    .slice(0, MAX_SAVES).map(({ learnerId, label, createdAt }) => ({ learnerId, label, createdAt }));
  if (!slots.length) return null;
  const activeId = slots.some((slot) => slot.learnerId === value.activeId) ? value.activeId : slots[0].learnerId;
  return { version: 1, activeId, slots };
}

// The lowest unused "Save N".
export function nextLabel(slots) {
  const used = new Set(slots.map((slot) => slot.label));
  for (let n = 1; ; n += 1) if (!used.has(`Save ${n}`)) return `Save ${n}`;
}

// The record after the server confirmed `learnerId`: kept as is when the slot is known, else the slot is added
// (a legacy or first-launch id becomes "Save 1"). The active id is always the confirmed one.
export function withActive(record, learnerId, now = new Date()) {
  const slots = record?.slots ?? [];
  if (slots.some((slot) => slot.learnerId === learnerId)) return { version: 1, activeId: learnerId, slots };
  return { version: 1, activeId: learnerId, slots: [...slots, { learnerId, label: nextLabel(slots), createdAt: now.toISOString() }] };
}
