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
  // Round 038 (critique 1.4): the lowest number a new save may take, raised when a save is removed.
  const nextNumber = Number.isInteger(value.nextNumber) && value.nextNumber > 1 ? value.nextNumber : undefined;
  return { version: 1, activeId, slots, ...(nextNumber ? { nextNumber } : {}) };
}

// The lowest unused "Save N", from `floor` on (round 038: a removed save's number is not given out again).
export function nextLabel(slots, floor = 1) {
  const used = new Set(slots.map((slot) => slot.label));
  for (let n = floor; ; n += 1) if (!used.has(`Save ${n}`)) return `Save ${n}`;
}

// Round 038: the record without `learnerId`, with the floor raised past the removed save's number.
export function withoutSlot(record, learnerId) {
  const removed = record.slots.find((slot) => slot.learnerId === learnerId);
  const number = Number(/^Save (\d+)$/.exec(removed?.label ?? '')?.[1] ?? 0);
  const nextNumber = Math.max(record.nextNumber ?? 1, number + 1);
  return { version: 1, activeId: record.activeId, slots: record.slots.filter((slot) => slot.learnerId !== learnerId), ...(nextNumber > 1 ? { nextNumber } : {}) };
}

// The record after the server confirmed `learnerId`: kept as is when the slot is known, else the slot is added
// (a legacy or first-launch id becomes "Save 1"). The active id is always the confirmed one.
export function withActive(record, learnerId, now = new Date()) {
  const slots = record?.slots ?? [];
  const floor = record?.nextNumber ? { nextNumber: record.nextNumber } : {};
  if (slots.some((slot) => slot.learnerId === learnerId)) return { version: 1, activeId: learnerId, slots, ...floor };
  return { version: 1, activeId: learnerId, slots: [...slots, { learnerId, label: nextLabel(slots, record?.nextNumber ?? 1), createdAt: now.toISOString() }], ...floor };
}
