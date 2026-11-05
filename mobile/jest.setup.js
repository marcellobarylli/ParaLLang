jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-speech', () => ({
  getAvailableVoicesAsync: jest.fn(async () => []),
  speak: jest.fn(),
  stop: jest.fn(async () => {}),
}));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

// Round 035 (critique 1.6): tests run with Reduce Motion on, so nothing animates unless a test turns it off.
const { AccessibilityInfo } = require('react-native');
jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockImplementation(() => Promise.resolve(true));

// Round 037: expo-audio has no native module under jest.
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({ loop: false, volume: 1, seekTo: jest.fn(async () => {}), play: jest.fn(), pause: jest.fn(), remove: jest.fn() })),
  setAudioModeAsync: jest.fn(async () => {}),
}));

// Round 040 (critique 1.3): tests do not pick up a developer's EXPO_PUBLIC_PARALLANG_TOKEN.
delete process.env.EXPO_PUBLIC_PARALLANG_TOKEN;
