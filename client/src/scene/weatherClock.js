// Round 146: the weather the page shows. It is the clock's (server/src/road/weather.js: the road's seed and the time
// give it), unless one is held still: a picture of the night is taken at any hour, and the console can ask for rain.
// The 3D view and the hub's weather line both read it here, so they never disagree. No three.js in this file.
import { weatherAt, weatherOf } from '../../../server/src/road/weather.js';

let pinned = null;
const listeners = new Set();

/** The weather to show for the road of `seed` now. */
export const currentWeather = (seed, now = Date.now()) => (pinned ? weatherOf(pinned) : weatherAt(now, seed));
/** Holds a weather still ({ phase, rain, cloud, wind }), or lets the clock's back with null. */
export function pinWeather(values) {
  pinned = values ? { ...values } : null;
  for (const listener of listeners) listener();
}
export const pinnedWeather = () => pinned;
/** Calls `listener` whenever a weather is pinned or let go; returns the way to stop. */
export function onWeatherPin(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
