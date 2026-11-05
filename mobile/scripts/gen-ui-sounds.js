// Round 037 (backlog C4a): the app's UI sounds, synthesized here (no third-party assets, no licence question).
// Deterministic: running it again writes identical bytes. Usage: node mobile/scripts/gen-ui-sounds.js [outDir]
// CommonJS so the jest test can import it and compare with the committed files (critique 1.9).
const { mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const RATE = 22050;
const PEAK = 10 ** (-12 / 20); // -12 dBFS

// A note: a sine with a soft octave harmonic, 5 ms attack, exponential decay.
function note(frequency, start, length, decay) {
  return { frequency, start, length, decay };
}
const CUES = {
  pass: [note(659.25, 0, 0.22, 9), note(987.77, 0.11, 0.24, 9)], // E5, B5
  resolve: [note(523.25, 0, 0.3, 7), note(659.25, 0.14, 0.3, 7), note(783.99, 0.28, 0.42, 6)], // C5, E5, G5
};

function render(notes) {
  const end = Math.max(...notes.map((n) => n.start + n.length));
  const samples = new Float64Array(Math.ceil(end * RATE));
  for (const { frequency, start, length, decay } of notes) {
    const from = Math.round(start * RATE);
    const count = Math.round(length * RATE);
    for (let i = 0; i < count && from + i < samples.length; i += 1) {
      const t = i / RATE;
      const attack = Math.min(1, t / 0.005);
      const tail = Math.min(1, (count - i) / (0.01 * RATE)); // 10 ms fade at the note's end: no click
      const envelope = attack * tail * Math.exp(-decay * t);
      samples[from + i] += envelope * (Math.sin(2 * Math.PI * frequency * t) + 0.25 * Math.sin(4 * Math.PI * frequency * t));
    }
  }
  const max = samples.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  return samples.map((v) => (v / max) * PEAK);
}

function wav(samples, rate = RATE) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + data.length, 4); header.write('WAVE', 8);
  header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24); header.writeUInt32LE(rate * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write('data', 36); header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const cueBytes = (name) => wav(render(CUES[name]));

module.exports = { RATE, CUES, render, wav, cueBytes };

if (require.main === module) {
  const outDir = process.argv[2] ?? join(__dirname, '..', 'assets', 'sounds');
  mkdirSync(outDir, { recursive: true });
  for (const name of Object.keys(CUES)) writeFileSync(join(outDir, `${name}.wav`), cueBytes(name));
  console.log(`wrote ${Object.keys(CUES).join(', ')} to ${outDir}`);
}
