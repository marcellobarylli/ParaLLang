import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { NearestFilter } from 'three';
import { PRESETS, PS1_STYLE, WORLDS, createWorld, hexToRgb, internalResolution } from '../src/index.js';
import { postFragmentShader } from '../src/ps1/shaders.js';

function meshes(object) {
  const out = [];
  object.traverse((o) => o.isMesh && out.push(o));
  return out;
}

for (const id of Object.keys(WORLDS)) {
  describe(`world: ${id}`, () => {
    const world = createWorld(id, { seed: 7 });

    test('builds headless and stays inside the triangle budget', () => {
      assert.ok(world.stats.triangles > 10000, `suspiciously few triangles: ${world.stats.triangles}`);
      assert.ok(
        world.stats.triangles <= PS1_STYLE.geometry.maxTrianglesPerScene,
        `${world.stats.triangles} triangles exceeds ${PS1_STYLE.geometry.maxTrianglesPerScene}`,
      );
      assert.ok(world.stats.meshes < 40, `${world.stats.meshes} meshes: buckets are not being merged`);
    });

    test('the same seed builds the same scene', () => {
      const again = createWorld(id, { seed: 7 });
      assert.equal(again.stats.triangles, world.stats.triangles);
      const a = world.scene.getObjectByName('props:stone').geometry.attributes.position.array;
      const b = again.scene.getObjectByName('props:stone').geometry.attributes.position.array;
      assert.deepEqual(Array.from(a.slice(0, 300)), Array.from(b.slice(0, 300)));
    });

    test('every mesh uses a PS1 material with vertex colours, uvs and normals', () => {
      for (const mesh of meshes(world.scene)) {
        assert.ok(mesh.material.userData.ps1, `${mesh.name} is not a PS1 material`);
        for (const attr of ['position', 'normal', 'uv', 'color']) {
          assert.ok(mesh.geometry.attributes[attr], `${mesh.name} (${mesh.material.name}) lacks ${attr}`);
        }
      }
    });

    test('textures follow the VRAM rules: small, power of two, nearest, no mipmaps', () => {
      for (const [name, t] of Object.entries(world.textures)) {
        const { width, height } = t.image;
        assert.ok(width <= PS1_STYLE.textures.maxSize && height <= PS1_STYLE.textures.maxSize, `${name} is ${width}x${height}`);
        assert.equal(width & (width - 1), 0, `${name} width not a power of two`);
        assert.equal(height & (height - 1), 0, `${name} height not a power of two`);
        assert.equal(t.magFilter, NearestFilter, `${name} mag filter`);
        assert.equal(t.minFilter, NearestFilter, `${name} min filter`);
        assert.equal(t.generateMipmaps, false, `${name} mipmaps`);
      }
    });

    test('every preset applies, and the sky horizon matches the fog colour', () => {
      const dome = world.scene.getObjectByName('sky').children[0].geometry;
      const pos = dome.attributes.position;
      const col = dome.attributes.color;
      let horizon = -1;
      for (let i = 0; i < pos.count; i++) if (Math.abs(pos.getY(i)) < 1e-3) horizon = i;
      assert.ok(horizon >= 0, 'dome has no horizon ring');
      for (const name of Object.keys(PRESETS)) {
        world.setPreset(name);
        const fog = hexToRgb(PRESETS[name].fog);
        const got = [col.getX(horizon), col.getY(horizon), col.getZ(horizon)];
        got.forEach((v, k) => assert.ok(Math.abs(v - fog[k]) < 1e-6, `${name}: horizon ${got} != fog ${fog}`));
        assert.equal(world.corruption, PRESETS[name].corruption);
      }
      world.setPreset(WORLDS[id].defaultPreset);
    });

    test('corruption is clamped and reaches the shared uniform', () => {
      world.setCorruption(2);
      assert.equal(world.uniforms.uCorruption.value, 1);
      world.setCorruption(-1);
      assert.equal(world.uniforms.uCorruption.value, 0);
    });

    test('carries its own camera tour', () => {
      assert.ok(world.tour.length >= 6);
      assert.equal(world.orbitTarget.length, 3);
    });

    test('roots carry the glowing strings', () => {
      const strands = world.scene.getObjectByName('props:rootGlow');
      assert.ok(strands && strands.geometry.attributes.position.count > 0);
      assert.ok(strands.material.uniforms.uGlow.value > 0);
    });
  });
}

test('Angkor Wat mirrors its props about the water plane', () => {
  const world = createWorld('angkor');
  const mirror = world.scene.getObjectByName('reflection');
  assert.ok(mirror);
  assert.equal(mirror.scale.y, -1);
  assert.equal(mirror.position.y, 2 * world.layout.waterY);
});

test('Ta Prohm has its face tower, thitpok trees and light shafts', () => {
  const world = createWorld('taprohm');
  for (const name of ['props:face', 'props:thitpok', 'props:devata', 'props:shaft']) {
    assert.ok(world.scene.getObjectByName(name), `missing ${name}`);
  }
  assert.equal(world.scene.getObjectByName('reflection'), undefined);
  assert.equal(world.preset, 'jungle');
});

// Round 133: The Kiln is Ta Prohm's plan under another theme.
test('The Kiln is Ta Prohm burnt: the same stone in the same place, no leaves, bare branches, lava and embers', () => {
  const temple = createWorld('taprohm');
  const kiln = createWorld('kiln');
  assert.equal(kiln.preset, 'ember');
  assert.equal(kiln.layout, temple.layout);
  for (const name of ['props:stone', 'props:devata', 'props:thitpok', 'props:rootGlow']) {
    const a = temple.scene.getObjectByName(name).geometry.attributes.position.array;
    const b = kiln.scene.getObjectByName(name).geometry.attributes.position.array;
    assert.equal(b.length, a.length, `${name}: the two levels differ in size`);
    for (let i = 0; i < a.length; i += 97) assert.equal(b[i], a[i], `${name}: vertex data differs at ${i}`);
  }
  assert.equal(kiln.scene.getObjectByName('props:leaves'), undefined);
  assert.ok(kiln.scene.getObjectByName('props:root').geometry.attributes.position.count > temple.scene.getObjectByName('props:root').geometry.attributes.position.count);
  for (const name of ['surface:lava', 'props:ember', 'props:shaft', 'surface:tuft']) assert.ok(kiln.scene.getObjectByName(name), `missing ${name}`);
  assert.equal(temple.scene.getObjectByName('surface:lava'), undefined);
});

test('The Kiln adds no texture: every map on its materials is one of the shared set', () => {
  const kiln = createWorld('kiln');
  const temple = createWorld('taprohm');
  assert.deepEqual(Object.keys(kiln.textures), Object.keys(temple.textures));
  const shared = new Set(Object.values(kiln.textures));
  kiln.scene.traverse((o) => {
    const map = o.isMesh ? o.material.uniforms.uMap.value : null;
    if (map) assert.ok(shared.has(map), `${o.name} uses a texture outside the shared set`);
  });
});

test('The Kiln glows red: the ember preset sets the glow colours, lights from the ground and glows in the stone', () => {
  const kiln = createWorld('kiln');
  const p = PRESETS.ember;
  assert.deepEqual(kiln.uniforms.uGlowColor.value.toArray(), hexToRgb(p.glow));
  assert.deepEqual(kiln.uniforms.uGlowHot.value.toArray(), hexToRgb(p.glowHot));
  assert.ok(p.ambientGround[0] > p.ambientSky[0], 'the light should come from the floor');
  assert.equal(kiln.uniforms.uCorruption.value, 1);
  for (const name of ['props:stone', 'props:devata', 'props:laterite', 'surface:litter']) {
    const u = kiln.scene.getObjectByName(name).material.uniforms;
    assert.ok(u.uGlow.value > 0 && u.uGlowDark.value.y > 0, `${name} does not glow`);
  }
  // The other presets keep the strings' violet, in both glow colours.
  kiln.setPreset('corrupted');
  assert.deepEqual(kiln.uniforms.uGlowColor.value.toArray(), hexToRgb(PS1_STYLE.palette.stringGlow));
  assert.deepEqual(kiln.uniforms.uGlowHot.value.toArray(), hexToRgb(PS1_STYLE.palette.stringGlow));
});

test('the heat options are off unless a material asks for them', () => {
  const temple = createWorld('taprohm');
  temple.scene.traverse((o) => {
    if (!o.isMesh) return;
    const u = o.material.uniforms;
    assert.equal(u.uGlowDark.value.y, 0, o.name);
    assert.equal(u.uGlowFade.value.x, 0, o.name);
    assert.equal(u.uRise.value.x, 0, o.name);
  });
});

test('internal resolution keeps 240 lines on the short side', () => {
  assert.deepEqual(internalResolution(640, 480), { width: 320, height: 240 });
  assert.deepEqual(internalResolution(1920, 1080), { width: 427, height: 240 });
  assert.deepEqual(internalResolution(1170, 2532), { width: 240, height: 519 });
  assert.deepEqual(internalResolution(800, 600, 0), { width: 800, height: 600 });
});

test('the dither table in the shader matches the style spec', () => {
  const body = postFragmentShader.match(/float\[16\]\(([^)]*)\)/)[1];
  const values = body.split(',').map((v) => Number(v.trim()));
  assert.deepEqual(values, PS1_STYLE.color.ditherMatrix.flat());
});
