// Round 162 (issue #11): makes the web client's model file from the models pulled from their sources. The sources
// are low-poly but not PS1-low: a tree of 1 000 to 3 000 triangles, where the endless level holds about thirty trees
// a chunk. Each model is cut down to what the level can carry, all of them are put into one file, and the file is
// compressed (quantized positions, meshopt), so the page asks for one small file, and only once the road is open.
//
//   node client/scripts/make-models.mjs <folder with the source .glb files> [out.glb]
//
// The sources, their licence and their checksums are in client/public/models/ASSETS.md. The tools are not
// dependencies of the repo; like Playwright they are taken from wherever Node finds them:
//   npm install --no-save @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions meshoptimizer
//
// What is done to a model: its normals and texture coordinates are dropped (the level shades every triangle flat and
// colours it from the material, as it does its own trees), its vertices are welded, and it is simplified to the
// share of its triangles in MODELS.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { Document, NodeIO } = require('@gltf-transform/core');
const { ALL_EXTENSIONS } = require('@gltf-transform/extensions');
const { dedup, mergeDocuments, meshopt, prune, quantize, simplify, unpartition, weld } = require('@gltf-transform/functions');
const { MeshoptEncoder, MeshoptSimplifier } = require('meshoptimizer');

// The models the level uses first (round 162's scope): the trees of the three biomes, bushes, and stones.
// `keep` is the share of a model's triangles that is kept.
export const MODELS = [
  { file: 'palm_tree_1', keep: 0.1 }, { file: 'palm_tree_2', keep: 0.1 }, { file: 'palm_tree_3', keep: 0.09 },
  { file: 'common_tree_1', keep: 0.07 }, { file: 'common_tree_2', keep: 0.075 }, { file: 'common_tree_3', keep: 0.055 },
  { file: 'pine_tree_1', keep: 0.12 }, { file: 'pine_tree_2', keep: 0.11 }, { file: 'pine_tree_3', keep: 0.15 },
  { file: 'bush_1', keep: 0.2 }, { file: 'bush_2', keep: 0.5 }, { file: 'bush_3', keep: 0.16 },
  { file: 'stone_1', keep: 1 }, { file: 'stone_2', keep: 1 }, { file: 'stone_3', keep: 1 },
];

const triangles = (document) => document.getRoot().listMeshes().flatMap((mesh) => mesh.listPrimitives())
  .reduce((sum, primitive) => sum + (primitive.getIndices()?.getCount() ?? primitive.getAttribute('POSITION').getCount()) / 3, 0);

async function main() {
  const [sourceDir, outPath = resolve(import.meta.dirname, '..', 'public', 'models', 'nature.glb')] = process.argv.slice(2);
  if (!sourceDir) throw new Error('usage: node client/scripts/make-models.mjs <folder with the source .glb files> [out.glb]');
  await Promise.all([MeshoptEncoder.ready, MeshoptSimplifier.ready]);
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
  const merged = new Document();
  const scene = merged.createScene('nature');
  const report = [];
  for (const { file, keep } of MODELS) {
    const path = join(resolve(sourceDir), `${file}.glb`);
    const bytes = readFileSync(path);
    const document = await io.readBinary(new Uint8Array(bytes));
    const before = triangles(document);
    for (const mesh of document.getRoot().listMeshes()) {
      for (const primitive of mesh.listPrimitives()) {
        for (const semantic of primitive.listSemantics()) if (semantic !== 'POSITION') primitive.setAttribute(semantic, null);
      }
    }
    await document.transform(weld(), ...(keep < 1 ? [simplify({ simplifier: MeshoptSimplifier, ratio: keep, error: 0.5, lockBorder: false })] : []), prune());
    // One node a model, named after its file, holding the model's parts.
    const root = document.getRoot();
    const holder = document.createNode(file);
    for (const sourceScene of root.listScenes()) for (const child of sourceScene.listChildren()) holder.addChild(child);
    for (const sourceScene of root.listScenes()) sourceScene.dispose();
    document.createScene(file).addChild(holder);
    report.push({ file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), before, after: triangles(document) });
    mergeDocuments(merged, document);
  }
  // mergeDocuments keeps each source's scene and buffer; the file has one of each.
  const root = merged.getRoot();
  for (const other of root.listScenes()) {
    if (other === scene) continue;
    for (const child of other.listChildren()) scene.addChild(child);
    other.dispose();
  }
  root.setDefaultScene(scene);
  await merged.transform(unpartition(), dedup(), prune(), quantize(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  const out = await io.writeBinary(merged);
  const { writeFileSync, mkdirSync } = await import('node:fs');
  mkdirSync(resolve(outPath, '..'), { recursive: true });
  writeFileSync(outPath, out);
  for (const row of report) console.log(`${row.file}.glb\t${row.bytes}\t${row.before}\t${row.after}\t${row.sha256}`);
  console.log(`${outPath}: ${out.length} bytes, ${report.reduce((sum, row) => sum + row.after, 0)} triangles in ${report.length} models (${report.reduce((sum, row) => sum + row.before, 0)} in the sources, ${report.reduce((sum, row) => sum + row.bytes, 0)} bytes)`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) await main();
