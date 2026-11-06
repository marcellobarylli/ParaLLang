// Round 042 (C3 remainder): titles in Literata Bold once it loads; the system font until then or on failure.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { useFonts } from 'expo-font';
import { DisplayFont, Title, fonts, useDisplayFont } from '../components/ui.js';

const root = join(__dirname, '..', '..');
const flat = (style) => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

beforeEach(() => { useFonts.mockReset(); useFonts.mockImplementation(() => [false, null]); });

test('a title keeps its own system-font weight until the font is ready, then Literata with the weight dropped', async () => {
  await render(<Title style={{ fontSize: 24, fontWeight: '700' }}>Spellbook</Title>);
  expect(flat(screen.getByRole('heading', { name: 'Spellbook' }).props.style)).toEqual({ fontSize: 24, fontWeight: '700' });
  await render(<DisplayFont.Provider value><Title style={{ fontSize: 24, fontWeight: '800' }}>Saves</Title></DisplayFont.Provider>);
  expect(flat(screen.getByRole('heading', { name: 'Saves' }).props.style)).toEqual({ fontSize: 24, fontFamily: 'Literata_700Bold', fontWeight: 'normal', fontStyle: 'normal' });
});

function Probe() {
  const ready = useDisplayFont();
  return <DisplayFont.Provider value={ready}><Text>{ready ? 'loaded' : 'waiting'}</Text><Title>T</Title></DisplayFont.Provider>;
}

test('useDisplayFont loads only the 700 face, and titles switch once it has loaded', async () => {
  useFonts.mockImplementation(() => [true, null]);
  await render(<Probe />);
  expect(useFonts).toHaveBeenCalledWith({ Literata_700Bold: expect.anything() });
  expect(screen.getByText('loaded')).toBeTruthy();
  expect(flat(screen.getByRole('heading', { name: 'T' }).props.style).fontFamily).toBe(fonts.display);
});

test('a font that fails to load leaves the system font', async () => {
  useFonts.mockImplementation(() => [false, new Error('no font')]);
  await render(<Probe />);
  expect(screen.getByText('waiting')).toBeTruthy();
  expect(flat(screen.getByRole('heading', { name: 'T' }).props.style)).toEqual({});
});

test('only the OFL-licensed 700 file is imported (never the package root), and the font name lives in ui.js only', () => {
  const licence = readFileSync(join(root, 'node_modules', '@expo-google-fonts', 'literata', 'LICENSE_FONT'), 'utf8');
  expect(licence).toMatch(/SIL Open Font License, Version 1\.1/);
  expect(readFileSync(join(root, 'THIRD_PARTY_NOTICES.md'), 'utf8')).toMatch(/Literata[\s\S]*SIL Open Font License, Version 1\.1/);
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : walk(path);
    return entry.name.endsWith('.js') ? [path] : [];
  });
  const sources = [join(root, 'App.js'), ...walk(join(root, 'src'))].map((file) => [file, readFileSync(file, 'utf8')]);
  const imports = sources.flatMap(([, text]) => [...text.matchAll(/(?:from |require\()'(@expo-google-fonts\/[^']+)'/g)].map(([, spec]) => spec));
  expect(imports).toEqual(['@expo-google-fonts/literata/700Bold']);
  expect(sources.filter(([, text]) => text.includes('Literata_700Bold')).map(([file]) => file.split('/').at(-1))).toEqual(['ui.js']);
});

test('screen and section titles go through Title; card titles and the review word stay on the system font', () => {
  const dir = join(root, 'src', 'components');
  const left = readdirSync(dir).flatMap((file) => [...readFileSync(join(dir, file), 'utf8').matchAll(/<Text role="heading" style=\{styles\.(\w+)\}/g)].map(([, name]) => `${file}:${name}`));
  expect([...new Set(left)].sort()).toEqual(['ReviewPanel.js:word', 'SavesPanel.js:cardTitle', 'Spellbook.js:annexTitle', 'Spellbook.js:cardTitle']); // round 111: the annex inside a file
  const titles = readdirSync(dir).flatMap((file) => [...readFileSync(join(dir, file), 'utf8').matchAll(/<Title style=\{styles\.(\w+)\}/g)].map(([, name]) => `${file}:${name}`));
  expect(titles).toHaveLength(11); // round 060: "Lines you translated"; round 082: "Inscriptions"
});
