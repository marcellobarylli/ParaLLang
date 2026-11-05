// Round 055 (critique 1.3): the voice cache in speech.js is module state; every test starts without it.
const { resetVoiceCacheForTests } = require('./src/speech.js');

beforeEach(() => { resetVoiceCacheForTests(); });
