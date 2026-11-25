// Round 178: save slots. A slot is this browser's own record of one learner: the learner id, the copy of the save,
// the place last entered and the title's landscape. Slot 1 keeps the keys as they always were, so a save made before
// slots is slot 1; slots 2 and 3 suffix them. Round 180: the opening message's dismissal is per slot too,
// so a new game greets the player again; (`parallang.learnerId.2`). Settings and display are shared by all slots.
// The game reads the slot chosen (SLOT_KEY) when the page loads; switching slots stores the choice and reloads.

export const SLOT_KEY = 'parallang.slot';
export const SLOT_COUNT = 3;
export const SLOTTED_KEYS = Object.freeze(['parallang.learnerId', 'parallang.save', 'parallang.placeId', 'parallang.title', 'parallang.welcomed']);

const read = (storage, key) => { try { return storage?.getItem?.(key) ?? null; } catch { return null; } };

/** The slot in use, 1 to SLOT_COUNT (1 when none was chosen or the stored value is not one). */
export function currentSlot(storage) {
  const value = Number(read(storage, SLOT_KEY));
  return Number.isInteger(value) && value >= 1 && value <= SLOT_COUNT ? value : 1;
}

/** A per-learner key as slot `slot` stores it. */
export const keyIn = (key, slot) => (slot === 1 || !SLOTTED_KEYS.includes(key) ? key : `${key}.${slot}`);

/** `storage` as the game in slot `slot` sees it: the per-learner keys are the slot's own, every other key is shared. */
export function slottedStorage(storage, slot = currentSlot(storage)) {
  if (!storage) return storage;
  return {
    getItem: (key) => storage.getItem(keyIn(key, slot)),
    setItem: (key, value) => storage.setItem(keyIn(key, slot), value),
    removeItem: (key) => storage.removeItem?.(keyIn(key, slot)),
  };
}

/** What each slot holds, for the menu: [{ slot, current, used, savedAt, conversations, words }]. */
export function slotSummaries(storage) {
  const current = currentSlot(storage);
  return Array.from({ length: SLOT_COUNT }, (_, index) => {
    const slot = index + 1;
    const used = Boolean(read(storage, keyIn('parallang.learnerId', slot)));
    let copy = null;
    try { copy = JSON.parse(read(storage, keyIn('parallang.save', slot)) ?? 'null'); } catch { copy = null; }
    const save = copy?.save ?? null;
    return {
      slot, current: slot === current, used,
      savedAt: typeof copy?.exportedAt === 'string' ? copy.exportedAt : null,
      conversations: Number.isInteger(save?.road?.step) ? save.road.step : null,
      words: save?.spellbook ? Object.keys(save.spellbook.words ?? {}).length + Object.keys(save.spellbook.phrases ?? {}).length : null,
    };
  });
}

/** Chooses the slot the next page load plays. */
export function chooseSlot(storage, slot) {
  if (!Number.isInteger(slot) || slot < 1 || slot > SLOT_COUNT) return false;
  try { storage?.setItem?.(SLOT_KEY, String(slot)); return true; } catch { return false; }
}

/** The learner id a slot holds, or null. */
export const learnerOf = (storage, slot) => read(storage, keyIn('parallang.learnerId', slot)) || null;

/**
 * Empties a slot: its next load starts a new game. Round 179: the slot in use too (that is starting over), when
 * `current` is allowed.
 */
export function clearSlot(storage, slot, { current = false } = {}) {
  if (!Number.isInteger(slot) || slot < 1 || slot > SLOT_COUNT || (slot === currentSlot(storage) && !current)) return false;
  for (const key of SLOTTED_KEYS) { try { storage?.removeItem?.(keyIn(key, slot)); } catch { /* private mode */ } }
  return true;
}
