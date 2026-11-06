// Round 055 (critique 1.3): the voice cache in speech.js is module state; every test starts without it. Round 064:
// the reset also drops speech.js's AppState subscription.
const { resetVoiceCacheForTests } = require('./src/speech.js');

beforeEach(() => { resetVoiceCacheForTests(); });
