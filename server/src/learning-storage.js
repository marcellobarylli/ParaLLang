import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { retryableError, validationError } from './errors.js';

export const SAVE_SCHEMA_VERSION = 1;
export const LEARNER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertLearnerId(learnerId) {
  if (!LEARNER_ID_PATTERN.test(String(learnerId ?? ''))) throw validationError('A valid learner ID is required.');
  return learnerId;
}

export function createLearnerEnvelope(learnerId) {
  return { schemaVersion: SAVE_SCHEMA_VERSION, learnerId, spellbook: { words: {}, phrases: {}, processedAssessments: {} } };
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
  return value;
}

export class JsonLearningStorage {
  constructor({ saveDir = resolve(import.meta.dirname, '..', 'data', 'saves'), io = {} } = {}) {
    this.saveDir = resolve(saveDir);
    this.io = { mkdir, readFile, rename, unlink, writeFile, ...io };
  }

  filePath(learnerId) { assertLearnerId(learnerId); return resolve(this.saveDir, `${learnerId}.json`); }

  async load(learnerId, { create = false } = {}) {
    const filePath = this.filePath(learnerId);
    try {
      const raw = await this.io.readFile(filePath, 'utf8');
      let parsed;
      try { parsed = JSON.parse(raw); }
      catch { throw retryableError('This learner save contains invalid JSON. The original file was preserved.', 'SAVE_UNREADABLE'); }
      return validateEnvelope(parsed, learnerId);
    } catch (error) {
      if (error.code === 'ENOENT' && create) return createLearnerEnvelope(learnerId);
      if (error.code === 'ENOENT') return null;
      if (error.retryable) throw error;
      throw retryableError(`The learner save could not be read: ${error.message}`, 'STORAGE_FAILURE');
    }
  }

  async save(envelope) {
    assertLearnerId(envelope.learnerId);
    validateEnvelope(envelope, envelope.learnerId);
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
