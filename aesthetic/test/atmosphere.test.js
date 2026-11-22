// Round 146: the endless level's sky, light and weather. The light follows the day and the cloud; the fog never
// lets the edge of the built ground show; rain, snow, stars, fireflies and lightning appear when they should, and
// lightning is one slow flash, never with reduced motion. Round 147: sunrise and sunset are scenes of their own, and
// there are clouds.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { ATMOSPHERE, EFFECTS, ENDLESS, atmosphereFor, createEndlessWorld, createWeatherEffects, hexToRgb } from '../src/index.js';
import { createTerrain } from '../../server/src/road/terrain.js';
import { WEATHER, weatherOf } from '../../server/src/road/weather.js';

const terrain = createTerrain(4242);
const brightness = (rgb) => rgb.reduce((sum, value) => sum + value, 0) / 3;
const sky = (values) => brightness(hexToRgb(atmosphereFor(weatherOf(values)).zenith));
const camera = (x, z, lift = 2) => ({ position: { x, y: terrain.heightAt(x, z) + lift, z } });
// A place on low dry ground and one above the snow line.
function find(test) {
  for (let x = -4000; x <= 4000; x += 40) for (let z = -4000; z <= 4000; z += 40) if (test(terrain.heightAt(x, z))) return [x, z];
  throw new Error('no such ground');
}
const low = find((h) => h > 3 && h < 20);
const high = find((h) => h > EFFECTS.snow.above + 4);

describe('the atmosphere', () => {
  test('night is dark and day is bright, twilight is coloured, cloud takes the colour out', () => {
    assert.ok(sky({ phase: 0.28 }) > 0.4 && sky({ phase: 0.78 }) < 0.06);
    const [noon, night, storm] = [0.28, 0.78, 0.28].map((phase, n) => atmosphereFor(weatherOf({ phase, rain: n === 2 ? 0.9 : 0 })));
    assert.ok(brightness(noon.ambientSky) > brightness(night.ambientSky) * 2);
    assert.ok(brightness(night.ambientSky) > 0.2, 'the night can still be read');
    assert.ok(brightness(noon.sunColor) > brightness(storm.sunColor) * 1.8, 'the sun is weak under a storm');
    const dawn = hexToRgb(atmosphereFor(weatherOf({ phase: 0.01 })).horizon);
    assert.ok(dawn[0] > dawn[2] * 1.2, 'a sunrise is warm at the horizon');
    const grey = hexToRgb(atmosphereFor(weatherOf({ phase: 0.28, rain: 1 })).zenith);
    assert.ok(Math.max(...grey) - Math.min(...grey) < 0.12, 'an overcast sky is grey');
  });

  test('through a whole day the light never comes from below, the fog hides the edge of the ground, and nothing jumps', () => {
    let before = null;
    for (let step = 0; step <= 2700; step += 1) {
      const p = atmosphereFor(weatherOf({ phase: step / 2700 }));
      assert.ok(p.sunDir[1] >= ATMOSPHERE.lowestSun - 1e-9);
      assert.ok(p.fogFar <= ENDLESS.fog.far && p.fogFar <= ENDLESS.radius * ENDLESS.chunk && p.fogNear < p.fogFar - 60);
      for (const key of ['zenith', 'mid', 'horizon', 'fog', 'sun', 'cloud', 'hills']) assert.match(p[key], /^#[0-9a-f]{6}$/);
      if (before) {
        for (const key of ['zenith', 'fog']) {
          const [a, b] = [hexToRgb(before[key]), hexToRgb(p[key])];
          assert.ok(Math.max(...a.map((value, i) => Math.abs(value - b[i]))) < 0.03, `${key} jumps at ${step}`);
        }
      }
      before = p;
    }
    // One second of a 45-minute day is one step of this walk through it.
    assert.equal(WEATHER.cycleMs / 1000, 2700);
  });

  test('the world takes a blended atmosphere as it takes a named preset', () => {
    const world = createEndlessWorld({ terrain });
    const p = atmosphereFor(weatherOf({ phase: 0.78, rain: 0.5 }));
    world.setAtmosphere(p);
    assert.ok(Math.abs(world.uniforms.uFogFar.value - p.fogFar) < 1e-9);
    assert.ok(Math.abs(world.uniforms.uAmbientSky.value.x - p.ambientSky[0]) < 1e-6);
    assert.ok(Math.abs(world.uniforms.uSunDir.value.length() - 1) < 1e-6);
    assert.equal(world.preset, 'day', 'the named preset is what it was');
  });
});

// Round 147: a sunset is orange and red under purple, a sunrise is pink and gold, and the sun goes down to the horizon.
describe('sunrise and sunset', () => {
  // The phases at which the sun stands on the horizon: going down, and coming up.
  const phaseWhere = (test) => { for (let step = 0; step <= 2700; step += 1) { const w = weatherOf({ phase: step / 2700 }); if (test(w)) return step / 2700; } throw new Error('no such moment'); };
  const sunset = phaseWhere((w) => !w.rising && w.height < 0.04 && w.height > 0);
  const sunrise = phaseWhere((w) => w.rising && w.height > 0 && w.height < 0.04);
  const at = (values) => { const p = atmosphereFor(weatherOf(values)); return { p, ...Object.fromEntries(['zenith', 'mid', 'horizon', 'cloud', 'cloudUnder'].map((key) => [key, hexToRgb(p[key])])) }; };

  test('a sunset: an orange and red horizon under a purple sky, and clouds lit from below', () => {
    const { zenith, mid, horizon, cloud, cloudUnder } = at({ phase: sunset });
    assert.ok(horizon[0] > 0.9 && horizon[1] > 0.3 && horizon[1] < 0.55 && horizon[2] < 0.25, 'the horizon is orange');
    assert.ok(mid[0] > 0.6 && mid[0] > mid[2] && mid[2] > mid[1] * 1.5, 'above it the sky is red');
    assert.ok(zenith[2] > zenith[0] && zenith[0] > zenith[1] * 1.3, 'and overhead it is purple');
    assert.ok(cloud[2] > cloud[1] && cloud[0] > cloud[1], 'the clouds are purple above');
    assert.ok(cloudUnder[0] > 0.9 && cloudUnder[0] > cloudUnder[2] * 2, 'and orange underneath');
  });

  test('a sunrise is its own: pink over gold, lighter than a sunset', () => {
    const [rise, set] = [at({ phase: sunrise }), at({ phase: sunset })];
    assert.ok(rise.horizon[0] > 0.9 && rise.horizon[1] > rise.horizon[2] * 1.5 && rise.horizon[1] > set.horizon[1] + 0.15, 'the horizon is gold, not orange');
    assert.ok(rise.mid[0] > rise.mid[2] && rise.mid[2] > rise.mid[1] - 0.05 && rise.mid[0] > 0.8, 'above it the sky is pink');
    assert.ok(brightness(rise.zenith) > brightness(set.zenith), 'and the sky overhead is lighter than at sunset');
  });

  test('the sun goes down to the horizon large, the moon comes up small, and the disc never jumps in sight', () => {
    const noon = atmosphereFor(weatherOf({ phase: 0.28 }));
    const low = atmosphereFor(weatherOf({ phase: sunset }));
    assert.ok(noon.sunDisc[1] > 0.8 && noon.sunScale === 1);
    assert.ok(low.sunDisc[1] < 0.05 && low.sunScale > 1.6 && low.sunDir[1] >= ATMOSPHERE.lowestSun, 'the disc is on the horizon and the light still comes from above');
    assert.ok(Math.abs(atmosphereFor(weatherOf({ phase: 0.78 })).sunScale - 0.7) < 1e-9, 'the moon is smaller');
    let before = null;
    for (let step = 0; step <= 2700; step += 1) {
      const p = atmosphereFor(weatherOf({ phase: step / 2700 }));
      if (before && (p.sunDisc[1] > -0.05 || before.sunDisc[1] > -0.05)) assert.ok(Math.abs(p.sunDisc[1] - before.sunDisc[1]) < 0.02, `the disc jumps at ${step}`);
      if (before) for (const key of ['horizon', 'mid', 'cloud', 'cloudUnder']) {
        const [a, b] = [hexToRgb(before[key]), hexToRgb(p[key])];
        assert.ok(Math.max(...a.map((value, i) => Math.abs(value - b[i]))) < 0.04, `${key} jumps at ${step}`);
      }
      before = p;
    }
  });

  test('scattered cloud leaves a sunset its colours; a sky full of rain is grey', () => {
    assert.equal(atmosphereFor(weatherOf({ phase: sunset, cloud: 0.3 })).horizon, atmosphereFor(weatherOf({ phase: sunset })).horizon);
    const wet = hexToRgb(atmosphereFor(weatherOf({ phase: sunset, rain: 1 })).horizon);
    assert.ok(Math.max(...wet) - Math.min(...wet) < 0.2);
  });
});

describe('the clouds', () => {
  const make = (options) => { const world = createEndlessWorld({ terrain }); return { world, effects: createWeatherEffects(world, options) }; };
  const layer = (effects) => effects.group.children[4];
  const shown = (effects) => layer(effects).children.filter((mesh) => mesh.visible);

  test('there are clouds on a clear day and more as the cover grows, all in reach of the camera and well above it', () => {
    const { effects } = make();
    const eye = camera(...low);
    effects.update(weatherOf({ phase: 0.3 }), 0.016, eye);
    const clear = effects.state.clouds;
    assert.ok(clear >= 6, `${clear} clouds on a clear day`);
    effects.update(weatherOf({ phase: 0.3, rain: 1 }), 0.016, eye);
    assert.ok(effects.state.clouds > clear * 1.6 && effects.state.clouds === shown(effects).length);
    for (const mesh of shown(effects)) {
      assert.ok(Math.hypot(mesh.position.x - eye.position.x, mesh.position.z - eye.position.z) <= EFFECTS.clouds.reach);
      assert.ok(mesh.position.y > eye.position.y + EFFECTS.clouds.top - EFFECTS.clouds.drop);
    }
  });

  test('the wind carries them, faster in a storm; they come along with the camera; they stand still with reduced motion', () => {
    const { effects } = make();
    const eye = camera(...low);
    const xs = () => layer(effects).children.map((mesh) => mesh.position.x);
    const moved = (weather) => { effects.update(weather, 0, eye); const from = xs(); effects.update(weather, 1, eye); return xs().map((x, n) => x - from[n]).filter((d) => Math.abs(d) < 100 && d !== 0); };
    const [calm, storm] = [moved(weatherOf({ phase: 0.3, rain: 1, wind: 0 })), moved(weatherOf({ phase: 0.3, rain: 1, wind: 1 }))];
    assert.ok(calm.length > 10 && calm.every((d) => Math.abs(d - EFFECTS.clouds.speed[0]) < 1e-6));
    assert.ok(storm.every((d) => Math.abs(d - EFFECTS.clouds.speed[1]) < 1e-6));
    const far = { position: { x: eye.position.x + 50_000, y: eye.position.y, z: eye.position.z - 80_000 } };
    effects.update(weatherOf({ phase: 0.3, rain: 1 }), 0.016, far);
    assert.ok(shown(effects).length > 20 && shown(effects).every((mesh) => Math.hypot(mesh.position.x - far.position.x, mesh.position.z - far.position.z) <= EFFECTS.clouds.reach));
    const still = make({ reducedMotion: true });
    still.effects.update(weatherOf({ phase: 0.3, rain: 1 }), 0, eye);
    const from = layer(still.effects).children.map((mesh) => mesh.position.x);
    still.effects.update(weatherOf({ phase: 0.3, rain: 1 }), 5, eye);
    assert.deepEqual(layer(still.effects).children.map((mesh) => mesh.position.x), from);
  });

  test('at sunset their undersides are orange and their tops purple; at noon they are white', () => {
    const { effects } = make();
    const faces = (test) => {
      const out = [];
      for (const mesh of layer(effects).children.slice(0, EFFECTS.clouds.shapes)) {
        const { normal, color } = mesh.geometry.attributes;
        for (let v = 0; v < normal.count; v += 3) if (test(normal.getY(v))) out.push([color.getX(v), color.getY(v), color.getZ(v)]);
      }
      return out;
    };
    let sunsetPhase = 0;
    for (let step = 0; step <= 2700; step += 1) { const w = weatherOf({ phase: step / 2700 }); if (!w.rising && w.height > 0 && w.height < 0.04) { sunsetPhase = step / 2700; break; } }
    effects.setAtmosphere(atmosphereFor(weatherOf({ phase: sunsetPhase })));
    const [under, over] = [faces((y) => y < -0.6), faces((y) => y > 0.85)];
    assert.ok(under.length > 20 && over.length > 20);
    assert.ok(under.every(([r, , b]) => r > 0.85 && r > b * 1.8), 'orange underneath');
    assert.ok(over.every(([r, g, b]) => b > g && r > g), 'purple on top');
    effects.setAtmosphere(atmosphereFor(weatherOf({ phase: 0.28 })));
    assert.ok(faces((y) => y > 0.85).every((rgb) => Math.min(...rgb) > 0.95), 'white at noon');
  });
});

describe('the weather\'s effects', () => {
  const make = (options) => { const world = createEndlessWorld({ terrain }); return { world, effects: createWeatherEffects(world, options) }; };

  test('rain falls on low ground, as much as it rains; on high ground it is snow', () => {
    const { effects } = make();
    const [rain, snow] = [effects.group.children[1], effects.group.children[2]];
    effects.update(weatherOf({ phase: 0.3 }), 0.016, camera(...low));
    assert.equal(rain.visible, false);
    effects.update(weatherOf({ phase: 0.3, rain: 0.3 }), 0.016, camera(...low));
    const light = rain.geometry.drawRange.count;
    effects.update(weatherOf({ phase: 0.3, rain: 1 }), 0.016, camera(...low));
    assert.ok(rain.visible && rain.geometry.drawRange.count > light && rain.geometry.drawRange.count === EFFECTS.rain.drops * 2);
    assert.equal(snow.visible, false);
    // Every drop is in the box round the camera.
    const at = camera(...low).position;
    const positions = rain.geometry.attributes.position.array;
    for (let n = 0; n < EFFECTS.rain.drops * 6; n += 3) {
      assert.ok(Math.abs(positions[n] - at.x) <= EFFECTS.rain.box / 2 + 1 && Math.abs(positions[n + 2] - at.z) <= EFFECTS.rain.box / 2 + 1);
      assert.ok(positions[n + 1] > at.y - EFFECTS.rain.height && positions[n + 1] < at.y + EFFECTS.rain.height);
    }
    effects.update(weatherOf({ phase: 0.3, rain: 0.8 }), 0.016, camera(...high));
    assert.deepEqual([rain.visible, snow.visible], [false, true]);
    assert.ok(effects.state.snow > 0.7 && effects.state.rain === 0);
  });

  test('stars on a clear night, none by day or under cloud; fireflies after dark when it is dry', () => {
    const { effects } = make();
    const at = camera(...low);
    effects.update(weatherOf({ phase: 0.78 }), 0.016, at);
    assert.ok(effects.state.stars > 0.7 && effects.state.fireflies === 1);
    effects.update(weatherOf({ phase: 0.78, rain: 0.5 }), 0.016, at);
    assert.deepEqual([effects.state.stars, effects.state.fireflies], [0, 0]);
    effects.update(weatherOf({ phase: 0.28 }), 0.016, at);
    assert.deepEqual([effects.state.stars, effects.state.fireflies], [0, 0]);
    effects.update(weatherOf({ phase: 0.78 }), 0.016, camera(...high));
    assert.equal(effects.state.fireflies, 0, 'no fireflies in the snow');
  });

  test('lightning: only in a storm, one slow flash at a time, and never with reduced motion', () => {
    const { world, effects } = make();
    const at = camera(...low);
    const storm = weatherOf({ phase: 0.78, rain: 0.95 });
    let flashes = 0;
    let lit = 0;
    const gaps = [];
    let since = 0;
    for (let frame = 0; frame < 60 * 120; frame += 1) {
      since += 1 / 60;
      if (effects.update(storm, 1 / 60, at).flash) { flashes += 1; gaps.push(since); since = 0; }
      if (world.uniforms.uLightBoost.value > 1.05) lit += 1;
      assert.ok(world.uniforms.uLightBoost.value <= EFFECTS.lightning.boost + 1e-9);
    }
    assert.ok(flashes >= 6 && flashes <= 26, `${flashes} flashes in two minutes`);
    assert.ok(gaps.slice(1).every((gap) => gap > 3), 'never a flicker: seconds between two flashes');
    assert.ok(lit / (60 * 120) < 0.06, 'the sky is lit for a small part of the time');
    for (let frame = 0; frame < 60; frame += 1) effects.update(weatherOf({ phase: 0.78, rain: 0.4 }), 1 / 60, at);
    assert.equal(world.uniforms.uLightBoost.value, 1, 'and the light is back to what it was');
    const calm = make({ reducedMotion: true });
    for (let frame = 0; frame < 60 * 60; frame += 1) assert.equal(calm.effects.update(storm, 1 / 60, at).flash, false);
    assert.equal(calm.world.uniforms.uLightBoost.value, 1);
  });

  test('the wind moves the trees\' crowns, more in a storm', () => {
    const { world, effects } = make();
    effects.update(weatherOf({ phase: 0.3 }), 0.016, camera(...low));
    const still = world.materials.leaves.uniforms.uSway.value;
    effects.update(weatherOf({ phase: 0.3, rain: 1 }), 0.016, camera(...low));
    assert.ok(world.materials.leaves.uniforms.uSway.value > still * 2);
  });
});
