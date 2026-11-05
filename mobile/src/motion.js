// Round 035 (backlog C3b): small transitions that respect the system's Reduce Motion setting.
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated } from 'react-native';

export const FADE_MS = 200;
export const START_OPACITY = 0.02;

// One app-wide reading of the setting. Until it is known, motion counts as reduced; a failed read keeps it so.
let current = null;
let started = false;
const listeners = new Set();
const publish = (value) => { current = value; for (const listener of listeners) listener(value); };
function watch() {
  if (started) return;
  started = true;
  Promise.resolve(AccessibilityInfo.isReduceMotionEnabled?.()).then((value) => publish(value !== false), () => publish(true));
  AccessibilityInfo.addEventListener?.('reduceMotionChanged', (value) => publish(Boolean(value)));
}
export function resetReduceMotionForTests() { current = null; started = false; listeners.clear(); }

export function useReduceMotion() {
  const [reduced, setReduced] = useState(current ?? true);
  useEffect(() => {
    watch();
    listeners.add(setReduced);
    if (current !== null) setReduced(current);
    return () => { listeners.delete(setReduced); };
  }, []);
  return reduced;
}

// Fades its children in once, on mount, when motion is known to be allowed; otherwise shows them as they are. The
// content is in the tree (and read by VoiceOver) from the first frame.
export function FadeIn({ style, children, animate = true, ...rest }) {
  const reduced = useReduceMotion();
  const fades = useRef(animate && current === false).current;
  // Critique 1.7: start just above 0, so VoiceOver never meets a fully transparent view.
  const progress = useRef(new Animated.Value(fades ? START_OPACITY : 1)).current;
  useEffect(() => {
    if (!fades) return undefined;
    if (reduced) { progress.setValue(1); return undefined; }
    const animation = Animated.timing(progress, { toValue: 1, duration: FADE_MS, useNativeDriver: true });
    animation.start();
    return () => { animation.stop(); progress.setValue(1); };
  }, [fades, reduced, progress]);
  if (!fades) return <Animated.View {...rest} style={style}>{children}</Animated.View>;
  const translateY = progress.interpolate({ inputRange: [START_OPACITY, 1], outputRange: [6, 0] });
  return <Animated.View {...rest} style={[style, { opacity: progress, transform: [{ translateY }] }]}>{children}</Animated.View>;
}
