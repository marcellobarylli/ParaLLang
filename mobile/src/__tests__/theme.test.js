// Round 034 (backlog C3a): one type scale and one palette, and text that stays readable on its backgrounds.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { colors, leading, type } from '../components/ui.js';

const root = join(__dirname, '..', '..');
// Critique 1.5: App.js and every source file under src/ except tests, with comments stripped.
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const path = join(dir, entry.name);
  if (entry.isDirectory()) return entry.name === '__tests__' ? [] : walk(path);
  return entry.name.endsWith('.js') ? [path] : [];
});
const sources = [join(root, 'App.js'), ...walk(join(root, 'src'))];
const code = (file) => readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/.*$/gm, '$1');
const isUi = (file) => file.endsWith(join('components', 'ui.js'));
const COLOUR = /['"]#[0-9a-fA-F]{3,8}['"]|\b(?:rgba?|hsla?)\(|\b(?:color|backgroundColor|borderColor|borderLeftColor|tintColor|shadowColor)\s*:\s*['"](?!#)[a-z]+['"]/g;
// Styles that only modify a sized style they are combined with or nested in (critique 1.2).
const MODIFIERS = new Set(['Spellbook.js:strong', 'ReviewPanel.js:emphasis', 'MapPanel.js:nodeNameKnown', 'MapPanel.js:nodeNameUnreachable', 'SavesPanel.js:switchOn', 'ui.js:primaryLabel', 'ui.js:textLabel', 'ui.js:display', 'ui.js:mark']); // round 057: mark is nested in the line's sized Text

test('no source sets a literal font size or colour outside ui.js', () => {
  expect(sources.length).toBeGreaterThan(15);
  for (const file of sources) {
    const text = code(file);
    expect([file, text.match(/fontSize\s*:\s*[\d.]/g)]).toEqual([file, null]);
    expect([file, text.match(/lineHeight\s*:\s*[\d.]/g)]).toEqual([file, null]); // round 035
    if (!isUi(file)) expect([file, text.match(COLOUR)]).toEqual([file, null]);
  }
  expect(colors.successSurface).toBe('#e7f3e8');
});

test('every text style names a size from the scale, except modifiers of a sized style', () => {
  const unsized = sources.flatMap((file) => [...code(file).matchAll(/^\s+(\w+): \{([^{}]*)\},?\s*$/gm)]
    .filter(([, , body]) => /(?<![A-Za-z])color:|fontWeight:|fontStyle:/.test(body) && !/fontSize:/.test(body))
    .map(([, name]) => `${file.split('/').at(-1)}:${name}`)
    .filter((key) => !MODIFIERS.has(key)));
  expect(unsized).toEqual([]);
  const used = sources.flatMap((file) => [...code(file).matchAll(/fontSize:\s*type\.(\w+)/g)].map(([, name]) => name));
  expect(used.length).toBeGreaterThan(40);
  expect(used.filter((name) => !(name in type))).toEqual([]);
  // Round 035 (critique 1.8): a line height sits with the size it was made for.
  const mismatched = sources.flatMap((file) => [...code(file).matchAll(/\{([^{}]*lineHeight:[^{}]*)\}/g)]
    .map(([, body]) => [body.match(/fontSize:\s*type\.(\w+)/)?.[1], body.match(/lineHeight:\s*leading\.(\w+)/)?.[1]])
    .filter(([size, height]) => !size || size !== height));
  expect(mismatched).toEqual([]);
});

test('the type scale is increasing and unique, from 11 points', () => {
  const sizes = Object.values(type);
  expect(sizes).toEqual([...sizes].sort((a, b) => a - b));
  expect(new Set(sizes).size).toBe(sizes.length);
  expect(sizes[0]).toBe(11);
  // Round 035: each line height belongs to a size of the scale and is 1.3–1.6 times it.
  for (const [name, height] of Object.entries(leading)) expect([name, height / type[name] >= 1.3 && height / type[name] <= 1.6]).toEqual([name, true]);
});

// WCAG 2 relative luminance and contrast ratio.
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

test('every text colour meets 4.5:1 on the backgrounds it is used on', () => {
  const pairs = [
    ...['ink', 'muted', 'accent', 'success', 'danger'].flatMap((fg) => [[fg, 'background'], [fg, 'surface']]),
    ['wordNoun', 'surface'], ['wordVerb', 'surface'], ['wordAdjective', 'surface'], // round 056: chips sit on surface
    ['accentInk', 'accent'], ['danger', 'dangerSurface'], ['muted', 'dangerSurface'], ['accent', 'dangerSurface'], ['success', 'successSurface'],
  ];
  // No text sits on the dot colours (border, muted, ink, success, accent fills on the map); disabled and pressed
  // controls are exempt (WCAG 1.4.3), and map nodes are not dimmed (critique 1.3).
  const failing = pairs.map(([fg, bg]) => [fg, bg, Number(contrast(colors[fg], colors[bg]).toFixed(2))]).filter(([, , ratio]) => ratio < 4.5);
  expect(failing).toEqual([]);
  expect(contrast('#ffffff', '#000000')).toBeCloseTo(21, 5);
});
