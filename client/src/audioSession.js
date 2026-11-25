// Round 184: iOS Safari treats Web Audio as "ambient" sound, which the ringer's silent switch mutes. The generated
// music (ambience.js) was therefore silent on a phone set to silent, and was heard only after the microphone had
// been used, since recording moves the page's audio session to "play-and-record", which the switch does not mute.
// The Audio Session API (Safari 16.4 and later) lets a page say it plays music: `navigator.audioSession.type`.
// Browsers without it are left alone.

/** Sets the page's audio session type ('playback', 'play-and-record', 'auto', …) where the browser has one. */
export function setAudioSession(type, scope = typeof window !== 'undefined' ? window : {}) {
  const session = scope.navigator?.audioSession;
  if (!session || typeof session !== 'object') return false;
  try {
    if (session.type !== type) session.type = type;
    return true;
  } catch { return false; }
}

/** The page's audio session type, or null where the browser has none. */
export const audioSessionType = (scope = typeof window !== 'undefined' ? window : {}) => scope.navigator?.audioSession?.type ?? null;
