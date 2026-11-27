// Round 197: the road's free look in a real browser. Plays the built client in headless Chromium against the real
// server code with a scripted model, ticks "Tilt to look", sends synthetic `deviceorientation` events (headless
// Chromium has no motion sensor) and measures where the rendered camera looks: a turn of the phone on the spot turns
// the look by as much, to 135 degrees either side; tilting the phone's top towards the player looks up, to nearly
// straight up. Pictures go to the round's shots/.
//
//   npm run build -w client
//   node client/scripts/free-look-check.mjs [outDir]
import { RoadProvider } from '../../server/test/road-helpers.js';
import { openGame } from './lib/play.mjs';

const game = await openGame({ out: process.argv[2] ?? 'docs/rounds/197/shots', provider: (content) => new RoadProvider(content), serviceOptions: { seedSource: () => 4242 } });
const DEG = 180 / Math.PI;

await game.run(async ({ page, check, shot }) => {
  await page.addInitScript(() => { if (!localStorage.getItem('parallang.title')) localStorage.setItem('parallang.title', JSON.stringify({ seed: 4242, at: '0,0' })); });
  await game.toRoad();
  await page.waitForFunction(() => window.__parallangRoad?.stats?.mode === 'hold', null, { timeout: 60000 });
  await page.evaluate(() => { document.querySelector('.dock').style.visibility = 'hidden'; window.__parallangRoad.pinWeather({ phase: 0.3, rain: 0, cloud: 0.15, wind: 0.1 }); });
  await page.evaluate(() => window.__parallang.store.getState().setTiltLook(true));
  await page.waitForTimeout(600);
  // The camera's line of sight: its heading (radians, as the director's sight: atan2(x, z)) and how far up it points.
  const sight = () => page.evaluate(() => {
    const m = window.__parallangRoad.camera.matrixWorld.elements;
    const [x, y, z] = [-m[8], -m[9], -m[10]];
    return { heading: Math.atan2(x, z), rise: Math.asin(Math.max(-1, Math.min(1, y / Math.hypot(x, y, z)))) };
  });
  // Holds the phone at `angles` for `ms`, at 60 events a second.
  const hold = async (angles, ms = 900) => {
    await page.evaluate(async ([a, duration]) => {
      const end = performance.now() + duration;
      while (performance.now() < end) {
        window.dispatchEvent(new DeviceOrientationEvent('deviceorientation', a));
        await new Promise((done) => setTimeout(done, 16));
      }
    }, [angles, ms]);
    return sight();
  };
  const turn = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b)) * DEG;
  const UPRIGHT = { alpha: 0, beta: 90, gamma: 0 };

  const ahead = await hold(UPRIGHT, 1500);
  await shot('01-ahead');
  const right = await hold({ ...UPRIGHT, alpha: -120 });
  check(Math.abs(turn(right.heading, ahead.heading) + 120) < 6, `a turn of 120° to the right turns the look ${turn(right.heading, ahead.heading).toFixed(1)}°`);
  const left = await hold({ ...UPRIGHT, alpha: 90 });
  check(Math.abs(turn(left.heading, ahead.heading) - 90) < 6, `a quarter turn to the left turns it ${turn(left.heading, ahead.heading).toFixed(1)}° to the left`);
  await shot('02-turned-left-90');
  const up = await hold({ alpha: 0, beta: 179.5, gamma: 0 });
  check(up.rise * DEG > 87, `the phone's top tilted right back, the look rises ${((up.rise - ahead.rise) * DEG).toFixed(1)}°, to ${(up.rise * DEG).toFixed(1)}° above the horizon`);
  await shot('03-up');
  const down = await hold({ alpha: 0, beta: 5, gamma: 0 });
  check(down.rise * DEG < -80, `and flat, face up, it looks down: ${(down.rise * DEG).toFixed(1)}°`);
  await shot('04-down');
  const back = await hold(UPRIGHT);
  check(Math.abs(turn(back.heading, ahead.heading)) < 4 && Math.abs((back.rise - ahead.rise) * DEG) < 4, 'held as at first, it looks ahead again');
  // Past 135° the look stops, and "ahead" is dragged along so the view never jumps across the back.
  const far = await hold({ ...UPRIGHT, alpha: 170 });
  check(Math.abs(turn(far.heading, ahead.heading) - 135) < 6, `turned 170°, the look stops at ${turn(far.heading, ahead.heading).toFixed(1)}° (135° each way, 270° in all)`);
  await shot('05-turned-left-135');
  const behind = await hold({ ...UPRIGHT, alpha: 200 });
  check(Math.abs(turn(behind.heading, ahead.heading) - 135) < 6, `turned on past the back (200°), it stays at the edge without a jump: ${turn(behind.heading, ahead.heading).toFixed(1)}°`);
  const eased = await hold({ ...UPRIGHT, alpha: 180 });
  check(Math.abs(turn(eased.heading, ahead.heading) - 115) < 6, `and 20° back answers at once: ${turn(eased.heading, ahead.heading).toFixed(1)}°`);
});
