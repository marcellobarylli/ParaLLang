import { mkdir, readdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { retryableError, validationError } from './errors.js';
import { emptyWorldProgress } from './world.js';

export const SAVE_SCHEMA_VERSION = 3;
export const LEARNER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertLearnerId(learnerId) {
  if (!LEARNER_ID_PATTERN.test(String(learnerId ?? ''))) throw validationError('A valid learner ID is required.');
  return learnerId;
}

export function createLearnerEnvelope(learnerId) {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    learnerId,
    spellbook: { words: {}, phrases: {}, processedAssessments: {} },
    world: emptyWorldProgress(),
    party: [],
  };
}

// Version 1 saves (rounds 001-004) hold only the Spellbook; version 2 (rounds 005-020) adds world progress. Both
// gain what they lack (empty world progress, an empty party) in memory and are written as version 3 on their next save.
function migrate(value) {
  if (value && typeof value === 'object' && value.schemaVersion === 1) {
    return { ...value, schemaVersion: SAVE_SCHEMA_VERSION, world: emptyWorldProgress(), party: [] };
  }
  if (value && typeof value === 'object' && value.schemaVersion === 2) {
    return { ...value, schemaVersion: SAVE_SCHEMA_VERSION, party: [] };
  }
  return value;
}

// Round 021: party members are defeated, saveable characters, one entry per character, in join order.
function validParty(party) {
  if (!Array.isArray(party)) return false;
  const seen = new Set();
  return party.every((member) => member && typeof member === 'object'
    && typeof member.characterId === 'string' && typeof member.encounterId === 'string'
    && typeof member.joinedAt === 'string' && Number.isFinite(Date.parse(member.joinedAt))
    // Round 022: resolved party conversations; missing means none yet.
    && (member.conversations === undefined || (Number.isInteger(member.conversations) && member.conversations >= 0))
    && !seen.has(member.characterId) && seen.add(member.characterId));
}

// Round 111 (backlog B8): the redacted annexes the player read anyway; `strainSpentOn` is null while the
// companion's strain is pending, then the encounter whose finished conversation spent it. As for lines, only the
// container is strict: an invalid or repeated entry is dropped and the save kept.
export const ANNEX_LIMIT = 20;
function validAnnexRecord(record) {
  return Boolean(record) && typeof record === 'object' && !Array.isArray(record)
    && typeof record.id === 'string' && record.id.length > 0 && record.id.length <= 100
    && typeof record.readAt === 'string' && Number.isFinite(Date.parse(record.readAt))
    && (record.strainSpentOn === null || (typeof record.strainSpentOn === 'string' && record.strainSpentOn.length > 0));
}

// Round 060 (backlog C9): NPC lines the player paid to translate. Only the container is strict (critique 1.4): an
// invalid entry is dropped and the save kept.
export const LINE_LIMIT = 50;
export const LINE_TEXT_LIMIT = 500;
const text = (value) => typeof value === 'string' && value.length > 0 && value.length <= LINE_TEXT_LIMIT;
function validLine(line) {
  return Boolean(line) && typeof line === 'object' && !Array.isArray(line)
    && ['id', 'encounterId', 'speaker', 'native', 'translation'].every((key) => text(line[key]))
    && (line.locationId === null || typeof line.locationId === 'string')
    && Array.isArray(line.vocabularyIds) && line.vocabularyIds.every((id) => typeof id === 'string')
    && typeof line.savedAt === 'string' && Number.isFinite(Date.parse(line.savedAt));
}

// Round 093 (backlog F13): a save keeps its RECEIPT_LIMIT newest assessment receipts. The one just written is always
// kept (critique 1.2: the injected clock may step back); the rest go by committedAt, ties by later entry (critique 1.3:
// integer-like attempt ids enumerate first, so that order is only write order for the usual UUID ids). Safe for any limit: every path that writes a receipt
// makes its input unreplayable once committed (a turn raises the encounter's version, an answered review challenge is
// deleted), so a resend whose receipt is gone is refused as stale, never applied twice. A new receipt writer must keep
// that rule.
export const RECEIPT_LIMIT = 20;
export function pruneReceipts(processed, { keepId, limit = RECEIPT_LIMIT } = {}) {
  const ids = Object.keys(processed);
  if (ids.length <= limit) return processed;
  const keep = keepId !== undefined && Object.hasOwn(processed, String(keepId)) ? String(keepId) : null;
  const time = (id) => { const at = Date.parse(processed[id]?.committedAt); return Number.isFinite(at) ? at : -Infinity; };
  // Equal times: the later entry first (write order for UUID ids; integer-like ids enumerate first, critique 1.3).
  const position = new Map(ids.map((id, index) => [id, index]));
  const others = ids.filter((id) => id !== keep).sort((a, b) => time(b) - time(a) || position.get(b) - position.get(a));
  const kept = new Set(others.slice(0, Math.max(0, limit - (keep === null ? 0 : 1))));
  if (keep !== null) kept.add(keep);
  for (const id of ids) if (!kept.has(id)) delete processed[id];
  return processed;
}

// Round 094 (backlog F15): each card keeps its EVIDENCE_LIMIT last-written evidence entries. Entries are appended in
// write order, so the tail is the newest written whatever the clock said (critique 1.1); never sorted by `at`.
// Nothing reads the history (SM-2 reads only `schedule`).
export const EVIDENCE_LIMIT = 20;
export function trimEvidence(spellbook, limit = EVIDENCE_LIMIT) {
  for (const bucket of [spellbook.words, spellbook.phrases]) {
    for (const item of Object.values(bucket)) {
      if (item.evidence.length > limit) item.evidence.splice(0, item.evidence.length - limit);
    }
  }
  return spellbook;
}

function validWorld(world) {
  const ids = (list) => Array.isArray(list) && list.every((id) => typeof id === 'string');
  return Boolean(world) && typeof world === 'object' && !Array.isArray(world)
    && (world.currentLocationId === null || typeof world.currentLocationId === 'string')
    && ids(world.visitedLocationIds) && ids(world.completedEncounterIds);
}

function validateEnvelope(value, learnerId) {
  if (!value || typeof value !== 'object' || value.schemaVersion !== SAVE_SCHEMA_VERSION) {
    throw retryableError('This learner save uses an unsupported or corrupt format. The original file was preserved.', 'SAVE_UNREADABLE');
  }
  if (value.learnerId !== learnerId || !value.spellbook || typeof value.spellbook !== 'object') {
    throw retryableError('This learner save is corrupt or belongs to another learner. The original file was preserved.', 'SAVE_UNREADABLE');
  }
  for (const key of ['words', 'phrases', 'processedAssessments']) {
    if (!value.spellbook[key] || typeof value.spellbook[key] !== 'object' || Array.isArray(value.spellbook[key])) {
      throw retryableError('This learner save is incomplete. The original file was preserved.', 'SAVE_UNREADABLE');
    }
  }
  for (const bucketName of ['words', 'phrases']) {
    for (const [vocabularyId, item] of Object.entries(value.spellbook[bucketName])) {
      const schedule = item?.schedule;
      const validItem = item && item.vocabularyId === vocabularyId
        && typeof item.contentVersion === 'string'
        && typeof item.discoveredAt === 'string' && Number.isFinite(Date.parse(item.discoveredAt))
        && Array.isArray(item.evidence)
        && schedule && Number.isFinite(schedule.ease)
        && Number.isInteger(schedule.repetitions) && Number.isFinite(schedule.intervalDays)
        && typeof schedule.dueAt === 'string' && Number.isFinite(Date.parse(schedule.dueAt));
      if (!validItem) {
        throw retryableError(`The learner save contains an invalid ${bucketName} card. The original file was preserved.`, 'SAVE_UNREADABLE');
      }
    }
  }
  for (const receipt of Object.values(value.spellbook.processedAssessments)) {
    if (!receipt || !['dialogue', 'review'].includes(receipt.kind) || typeof receipt.payloadHash !== 'string' || !receipt.response || typeof receipt.response !== 'object') {
      throw retryableError('The learner save contains an invalid assessment receipt. The original file was preserved.', 'SAVE_UNREADABLE');
    }
  }
  if (!validWorld(value.world)) {
    throw retryableError('The learner save contains invalid world progress. The original file was preserved.', 'SAVE_UNREADABLE');
  }
  if (!validParty(value.party)) {
    throw retryableError('The learner save contains an invalid party. The original file was preserved.', 'SAVE_UNREADABLE');
  }
  if (value.lines !== undefined) {
    if (!Array.isArray(value.lines)) throw retryableError('The learner save contains invalid translated lines. The original file was preserved.', 'SAVE_UNREADABLE');
    value.lines = value.lines.filter(validLine).slice(0, LINE_LIMIT);
  }
  if (value.annexes !== undefined) {
    if (!Array.isArray(value.annexes)) throw retryableError('The learner save contains invalid annex records. The original file was preserved.', 'SAVE_UNREADABLE');
    value.annexes = value.annexes.filter(validAnnexRecord).filter((record, index, all) => all.findIndex((other) => other.id === record.id) === index).slice(0, ANNEX_LIMIT);
  }
  return value;
}

export class JsonLearningStorage {
  constructor({ saveDir = resolve(import.meta.dirname, '..', 'data', 'saves'), io = {} } = {}) {
    this.saveDir = resolve(saveDir);
    this.io = { mkdir, readdir, readFile, rename, unlink, writeFile, ...io };
  }

  filePath(learnerId) { assertLearnerId(learnerId); return resolve(this.saveDir, `${learnerId}.json`); }

  async load(learnerId, { create = false } = {}) {
    const filePath = this.filePath(learnerId);
    try {
      const raw = await this.io.readFile(filePath, 'utf8');
      let parsed;
      try { parsed = JSON.parse(raw); }
      catch { throw retryableError('This learner save contains invalid JSON. The original file was preserved.', 'SAVE_UNREADABLE'); }
      return validateEnvelope(migrate(parsed), learnerId);
    } catch (error) {
      if (error.code === 'ENOENT' && create) return createLearnerEnvelope(learnerId);
      if (error.code === 'ENOENT') return null;
      if (error.retryable) throw error;
      throw retryableError(`The learner save could not be read: ${error.message}`, 'STORAGE_FAILURE');
    }
  }

  // Round 039: deletes a learner's save, and any temporary copy a failed write left behind (critique 1.1). A missing
  // file counts as deleted (idempotent).
  async remove(learnerId) {
    const filePath = this.filePath(learnerId);
    const unlinkQuietly = async (path) => {
      try { await this.io.unlink(path); return true; }
      catch (error) {
        if (error.code === 'ENOENT') return false;
        throw retryableError(`The learner save could not be deleted: ${error.message}`, 'STORAGE_FAILURE');
      }
    };
    let leftovers = [];
    try { leftovers = (await this.io.readdir(this.saveDir)).filter((name) => name.startsWith(`.${learnerId}.`) && name.endsWith('.tmp')); }
    catch (error) { if (error.code !== 'ENOENT') throw retryableError(`The learner save could not be deleted: ${error.message}`, 'STORAGE_FAILURE'); }
    for (const name of leftovers) await unlinkQuietly(resolve(this.saveDir, name));
    // Round 090 (critique 1.1): a save this server cannot read is kept aside, never loaded again, so "The original
    // file was preserved" stays true (it may be a newer server's save).
    let unreadable = false;
    try { await this.load(learnerId); }
    catch (error) { if (error.code === 'SAVE_UNREADABLE') unreadable = true; }
    if (unreadable) {
      try { await this.io.rename(filePath, resolve(this.saveDir, `${learnerId}.unreadable-${Date.now()}-${randomUUID().slice(0, 8)}.json`)); return true; }
      catch (error) {
        if (error.code === 'ENOENT') return false;
        throw retryableError(`The learner save could not be set aside: ${error.message}`, 'STORAGE_FAILURE');
      }
    }
    return unlinkQuietly(filePath);
  }

  // Round 093: every save prunes the receipts (critique 1.6: an old save shrinks on its next write of any kind);
  // round 094: and trims each card's evidence.
  async save(envelope, { keepReceiptId } = {}) {
    assertLearnerId(envelope.learnerId);
    validateEnvelope(envelope, envelope.learnerId);
    pruneReceipts(envelope.spellbook.processedAssessments, { keepId: keepReceiptId });
    trimEvidence(envelope.spellbook); // round 094
    try { await this.io.mkdir(this.saveDir, { recursive: true }); }
    catch (error) { throw retryableError(`Progress could not be saved: ${error.message}`, 'STORAGE_FAILURE'); }
    const destination = this.filePath(envelope.learnerId);
    const temporary = resolve(this.saveDir, `.${envelope.learnerId}.${randomUUID()}.tmp`);
    try {
      await this.io.writeFile(temporary, `${JSON.stringify(envelope, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
      await this.io.rename(temporary, destination);
    } catch (error) {
      try { await this.io.unlink(temporary); } catch { /* best-effort cleanup */ }
      throw retryableError(`Progress could not be saved: ${error.message}`, 'STORAGE_FAILURE');
    }
    return envelope;
  }
}
