// Round 115: plays the built web client through the whole Ta Prohm dungeon in headless Chromium and captures each
// camera state at a phone and a desktop size. It is the round's end-to-end check and the source of
// docs/rounds/115/shots/, docs/rounds/116/shots/ and docs/rounds/119/shots/. Round 116: it also asserts that the
// gameplay and the camera move together (no dialogue while the camera travels, a step in for each closed objective),
// and fails if they do not. Round 119: the dungeon is a map under a world map. The script walks all seven sites by
// the ways on, the temple map and a site card, leaves a conversation and returns to it, and looks at the fog.
// Round 120: it saves Gerald to the party after his site, opens the Party panel and talks to him.
// Round 122: at each site it checks the character's figure: shown whole, turned to the camera, its face inside the
// part of the screen the panels leave free, at the first hold and after the resolve; and the scene's triangles.
// Round 121: it watches the experience grow, meets the Sanctuary's level seal with the six sites cleared at level 4,
// talks to Gerald again to reach level 5, and enters.
//
//   npm run build -w client
//   CHROME_PATH=/path/to/chrome PUPPETEER_CORE=/path/to/node_modules/puppeteer-core node client/scripts/dungeon-shots.mjs [outDir]
//
// What runs: an in-process server with the fixture provider of the server's tests (no model is called), bound to
// 127.0.0.1 behind a random access token, and Chromium with software WebGL (SwiftShader). The page is served from
// client/dist by request interception under https://parallang.test/ParaLLang/ (a subpath, as on GitHub Pages), and
// its /api requests are passed to the server
// with the token the client sends from its settings. The server listens on a port: on the real-itu cluster run this
// inside a Slurm job, never on the login node. puppeteer-core is not a dependency of the repo.
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadGameContent } from '../../server/src/content-loader.js';
import { PassingProvider, createRuntime, passingAnswers } from '../../server/test/helpers.js';

const ROOT = resolve(import.meta.dirname, '..', '..');
const DIST = join(ROOT, 'client', 'dist');
const OUT = resolve(process.argv[2] ?? join(ROOT, 'docs', 'rounds', '122', 'shots'));
const ORIGIN = 'https://parallang.test';
const BASE_PATH = '/ParaLLang/'; // the page is served under a subpath, as on GitHub Pages
const EXTRA = process.env.SHOTS_EXTRA === '1'; // also the in-between and debugging pictures
const SIZES = [
  { name: 'phone', width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { name: 'desktop', width: 1440, height: 900, deviceScaleFactor: 1 },
];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

async function loadPuppeteer() {
  const from = process.env.PUPPETEER_CORE;
  if (!from) return (await import('puppeteer-core')).default;
  const entry = createRequire(join(resolve(from), 'package.json')).resolve(resolve(from));
  const loaded = await import(pathToFileURL(entry).href);
  const module = loaded.default ?? loaded;
  return typeof module.launch === 'function' ? module : module.default;
}

// The fixture provider narrates every encounter as Gerald, in Spanish. For the pictures each character gets a line
// of their own in the Italian pack's mix. These lines are stand-ins written for this script: no model wrote them.
const LINES = {
  Portia: {
    greeting: ['The archway unrolls a form longer than she is tall.', 'Benvenuto al mercato! State your greeting for the record, per favore.', 'Welcome to the market! State your greeting for the record, please.'],
    reply: ['A stamp falls somewhere inside the stonework.', 'Bene. The form approves. Piacere!', 'Good. The form approves. Pleased to meet you!'],
  },
  Gerald: {
    greeting: ['A tiny barista glares over a cup with union-approved suspicion.', 'Vuoi un caffè? Senza latte is the only civilised option.', 'Do you want a coffee? Without milk is the only civilised option.'],
    reply: ['Gerald consults an imaginary tasting chart and issues a verdict.', 'Bene. Your caffè will be taken seriously.', 'Good. Your coffee will be taken seriously.'],
  },
  Mortimer: {
    greeting: ['A charcutier weighs you with the scale he keeps for customers.', 'Buongiorno. Il prosciutto is not for tourists, capito?', 'Good morning. The ham is not for tourists, understood?'],
    reply: ['Mortimer wraps something in paper with the gravity of a notary.', 'Ecco. Un etto, as the law intended.', 'There. A hundred grams, as the law intended.'],
  },
  Flick: {
    greeting: ['Something lies in the shaft of light and has clearly been lying there since Tuesday.', 'Che ore sono? No, wait. Don\'t tell me. Troppo effort.', 'What time is it? No, wait. Don\'t tell me. Too much effort.'],
    reply: ['Flick lifts one eyelid by a negotiated amount.', 'Va bene. Sono le tre, or whatever.', 'All right. It is three o\'clock, or whatever.'],
  },
  Marginalia: {
    greeting: ['A bookworm looks up from a page she has been annotating in the margin of the margin.', 'Silenzio! This libro is at the good part.', 'Silence! This book is at the good part.'],
    reply: ['Marginalia files your sentence under "promising".', 'Brava. La pagina is yours.', 'Well done. The page is yours.'],
  },
  Errata: {
    greeting: ['The air misprints itself. Something that was a footnote unfolds.', 'B̷u̷o̷n̷g̷i̷o̷r̷n̷o̷. Correct me, se puoi.', 'Good morning. Correct me, if you can.'],
    reply: ['A line of the world comes back into register.', 'Corretto. I am one erratum shorter.', 'Correct. I am one erratum shorter.'],
  },
  Bambieshart: {
    greeting: ['A wanderer presses a folded brocade into your hands with great ceremony.', 'Tarnished! Ecco, a brocade for you. Bello, no?', 'Tarnished! Here, a brocade for you. Beautiful, no?'],
    reply: ['Bambieshart nods as if a prophecy had just been filed correctly.', 'Bene, bene. The road is long, amico.', 'Good, good. The road is long, friend.'],
  },
};

class ShotsProvider extends PassingProvider {
  narrate(messages) {
    const prompt = messages.at(-1).content;
    const name = Object.keys(LINES).find((candidate) => prompt.includes(`introduce ${candidate} at`) || prompt.includes(`React as ${candidate} to`)) ?? 'Gerald';
    const [narrative, native, translation] = LINES[name][prompt.includes('introduce ') ? 'greeting' : 'reply'];
    return { ...super.narrate(messages), narrative, dialogue: { speaker: name, native, translation, words: [] } };
  }
}

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function serveDist(page, runtime) {
  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    try {
      const url = new URL(request.url());
      if (url.origin !== ORIGIN) return void request.abort();
      if (url.pathname.startsWith('/api/')) {
        const headers = { ...request.headers() };
        for (const name of ['host', 'origin', 'referer', 'content-length']) delete headers[name];
        const reply = await fetch(`${runtime.baseUrl}${url.pathname}${url.search}`, { method: request.method(), headers, body: request.postData() });
        return void request.respond({ status: reply.status, contentType: 'application/json', body: await reply.text() });
      }
      if (!url.pathname.startsWith(BASE_PATH)) return void request.respond({ status: 404, body: '' });
      const relative = decodeURIComponent(url.pathname.slice(BASE_PATH.length)) || 'index.html';
      const file = join(DIST, relative);
      if (!file.startsWith(DIST)) return void request.respond({ status: 403, body: '' });
      const body = await readFile(file).catch(() => null);
      if (!body) return void request.respond({ status: 404, body: '' });
      return void request.respond({ status: 200, contentType: TYPES[extname(file)] ?? 'application/octet-stream', body });
    } catch (error) {
      console.error('request failed', request.url(), error.message);
      request.abort().catch(() => {});
    }
  });
}

const state = (page) => page.evaluate(() => {
  const s = window.__parallang.store.getState();
  const level = window.__parallangLevel;
  return {
    phase: s.phase, siteIndex: s.siteIndex, siteId: s.dungeon.sites[s.siteIndex].id, connection: s.connection, isLoading: s.isLoading, error: s.error, siteError: s.siteError,
    at: s.progress?.at ?? null, cleared: s.progress?.clearedSiteIds ?? [], card: document.querySelector('.site-card')?.textContent ?? null,
    progression: s.progression, xpGained: s.xpGained, levelUp: s.levelUp, chip: document.querySelector('.level-chip')?.textContent ?? null,
    // Round 122: the figure at the camera's site, and where its face falls on the screen and in the free part of it.
    figure: level && (() => {
      const figure = level.figures[s.siteIndex];
      if (!figure) return null;
      const pose = level.director.pose;
      const toCamera = Math.atan2(pose.position[0] - figure.position[0], pose.position[2] - figure.position[2]);
      let off = Math.abs(figure.facing - toCamera) % (2 * Math.PI);
      if (off > Math.PI) off = 2 * Math.PI - off;
      const ndc = level.camera.position.clone().set(figure.position[0], figure.position[1] + figure.focus, figure.position[2]).project(level.camera);
      const face = [Math.round(((ndc.x + 1) / 2) * innerWidth), Math.round(((1 - ndc.y) / 2) * innerHeight)];
      const hud = document.querySelector('.hud')?.getBoundingClientRect();
      const dock = document.querySelector('.dock')?.getBoundingClientRect();
      const side = dock && dock.height >= innerHeight * 0.9 && dock.width < innerWidth * 0.75; // a side panel
      const free = { left: 0, top: Math.round(hud?.bottom ?? 0), right: Math.round(side ? dock.left : innerWidth), bottom: Math.round(dock && !side ? dock.top : innerHeight) };
      return { name: figure.name, visible: figure.visible, scale: Math.round(figure.scale * 100) / 100, offDegrees: Math.round((off * 180) / Math.PI), face, free, inFree: ndc.z < 1 && face[0] >= free.left && face[0] <= free.right && face[1] >= free.top && face[1] <= free.bottom };
    })(),
    labels: [...document.querySelectorAll('.site-label')].filter((label) => !label.hidden).map((label) => label.textContent), fog: level?.hiddenSites ?? null,
    encounter: s.encounter && { id: s.encounter.encounterId, state: s.encounter.state, version: s.encounter.version },
    closedObjectives: s.closedObjectives, beat: s.beat, sheet: Boolean(document.querySelector('.sheet')), caption: document.querySelector('.caption')?.textContent ?? null,
    camera: level && (() => {
      const { director } = level;
      const pose = director.pose;
      const site = s.dungeon.sites[s.siteIndex].at;
      const round = (v) => Math.round(v * 100) / 100;
      return {
        mode: director.mode, stage: director.stage, site: director.site, arrival: director.arrival, position: pose.position.map(round), target: pose.target.map(round),
        toSite: round(Math.hypot(pose.position[0] - site[0], pose.position[2] - site[1])), targetToSite: round(Math.hypot(pose.target[0] - site[0], pose.target[2] - site[1])),
      };
    })(),
  };
});
const waitFor = (page, test, arg, timeout = 90000) => page.waitForFunction(test, { timeout, polling: 100 }, arg);
const waitPhase = (page, phase) => waitFor(page, (wanted) => window.__parallang.store.getState().phase === wanted, phase);
const waitArrived = (page, mode) => waitFor(page, (wanted) => window.__parallangLevel?.director.mode === wanted && window.__parallangLevel.director.arrived, mode);

async function clickButton(page, name) {
  const clicked = await page.evaluate((label) => {
    const button = [...document.querySelectorAll('button')].find((element) => (element.getAttribute('aria-label') ?? element.textContent).trim().startsWith(label) && !element.disabled);
    button?.click();
    return Boolean(button);
  }, name);
  if (!clicked) throw new Error(`No enabled button "${name}"`);
}

async function run(browser, runtime, size, log) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport(size);
  const problems = [];
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('error', (error) => console.error('page crashed:', error.message));
  page.on('close', () => console.error('page closed'));
  page.on('console', (message) => { if (message.type() === 'error') problems.push(`console: ${message.text()}`); });
  await serveDist(page, runtime);
  await page.evaluateOnNewDocument((settings) => { localStorage.setItem('parallang.settings', settings); }, JSON.stringify({ serverUrl: ORIGIN, token: runtime.token }));

  const shot = async (name, { settle = 900 } = {}) => {
    await sleep(settle);
    const file = join(OUT, `${name}-${size.name}.jpg`);
    await page.screenshot({ path: file, type: 'jpeg', quality: 72 });
    const now = await state(page);
    log.push({ shot: `${name}-${size.name}.jpg`, ...now });
    console.log('shot', `${name}-${size.name}`, JSON.stringify(now.camera), now.phase);
  };
  // Round 116: the coupling of gameplay and camera, asserted in the real browser.
  const check = (ok, message) => { if (!ok) { problems.push(`coupling: ${message}`); console.error('COUPLING FAILED:', message); } };
  const names = Object.fromEntries(runtime.content.dungeons.get('ta_prohm').sites.map((site, index) => [site.id, { index, name: site.name }]));
  // The camera is holding at site `id`, looking at it. With `sheet`, the dialogue is open there.
  const arrivedAt = async (id, { sheet = true } = {}) => {
    const { index } = names[id];
    const now = await state(page);
    check(now.at === id && now.siteIndex === index, `${id}: the player stands there (${now.at}, site ${now.siteIndex})`);
    check(now.sheet === sheet, `${id}: the dialogue sheet is ${sheet ? 'open' : 'closed'}`);
    if (!sheet) check(now.phase === 'site' && now.card?.includes(names[id].name), `${id}: the site card shows (${now.phase}, ${now.card})`);
    check(now.camera.stage === 'hold' && now.camera.site === index, `${id}: the camera holds at the site (${now.camera.mode}/${now.camera.stage}, site ${now.camera.site})`);
    check(now.camera.toSite < (index === 0 ? 10.5 : 4.5), `${id}: the camera stands by the site (${now.camera.toSite} m)`);
    check(now.camera.targetToSite < 0.5, `${id}: the camera looks at the site (${now.camera.targetToSite} m off)`);
    if (sheet) check(now.closedObjectives === 0, `${id}: the conversation starts with nothing closed`);
    // Round 122: the character stands there, whole, turned to the camera, its face in the free part of the screen.
    // The view slides to the free part over about a second after the sheet opens, so the figure is read after that.
    await sleep(1600);
    const f = (await state(page)).figure;
    check(f && f.visible && f.scale >= 0.99, `${id}: the figure is shown whole (${JSON.stringify(f)})`);
    check(f && f.offDegrees <= 25, `${id}: the figure faces the camera (${f?.offDegrees} degrees off)`);
    check(f && f.inFree, `${id}: the figure's face is inside the free part of the screen (${JSON.stringify(f?.face)} in ${JSON.stringify(f?.free)})`);
  };
  const answerSite = async () => {
    const start = await state(page);
    const id = start.siteId;
    let previous = start;
    for (const answer of passingAnswers(runtime.content, start.encounter.id)) {
      await page.type('#player-response', answer);
      await clickButton(page, 'Send');
      await waitFor(page, (version) => { const s = window.__parallang.store.getState(); return !s.isLoading && (s.encounter?.version !== version || s.error); }, previous.encounter.version);
      await sleep(2600); // the step in eases over about two seconds
      const after = await state(page);
      if (after.error) throw new Error(`Send failed: ${after.error}`);
      check(after.beat?.id === (previous.beat?.id ?? 0) + 1, `${id}: the verdict is numbered (${JSON.stringify(after.beat)})`);
      if (after.closedObjectives > previous.closedObjectives) check(after.camera.toSite < previous.camera.toSite + 0.3, `${id}: a closed objective does not step the camera back (${previous.camera.toSite} to ${after.camera.toSite} m)`);
      previous = after;
    }
    const end = await state(page);
    if (end.encounter.state !== 'resolved') throw new Error(`${start.encounter.id} did not resolve`);
    check(end.camera.toSite < start.camera.toSite * 0.85 && end.camera.toSite > 2, `${id}: resolved, the camera has stepped in (${start.camera.toSite} to ${end.camera.toSite} m)`);
    check(end.camera.targetToSite < 0.5, `${id}: resolved, the camera keeps looking at the site (${end.camera.targetToSite} m off)`);
    check(end.camera.mode !== 'victory' && end.phase === 'encounter', `${id}: the walk waits for the player`);
    check(end.cleared.includes(id), `${id}: the site is cleared (${end.cleared})`);
    check(end.figure && end.figure.visible && end.figure.scale >= 0.99 && end.figure.inFree, `${id}: resolved and stepped in, the figure is whole and its face is still in the free part of the screen (${JSON.stringify(end.figure)})`);
    // Round 121: ten for each objective and twenty-five for the resolve, and the top bar shows the level.
    const earned = 10 * passingAnswers(runtime.content, start.encounter.id).length + 25;
    check(end.progression.xp - start.progression.xp === earned && end.xpGained > 0, `${id}: the conversation earned ${earned} XP (${start.progression.xp} to ${end.progression.xp}, last +${end.xpGained})`);
    check(end.chip === `Lv ${end.progression.level}`, `${id}: the top bar shows the level (${end.chip}, level ${end.progression.level})`);
  };
  // A walk the player picks with the button `label`, to site `to`, which opens a conversation or the site's card.
  const walk = async (label, to, { shots = [], name = null, opens = 'encounter', through = null } = {}) => {
    const before = await state(page);
    // Review 1 of round 122 (R1.3): a walk that leads through the place of the figure at the site it leaves. A watcher
    // in the page reads that figure every frame: whole beyond 2.1 m, shrinking to 1.3 m, gone within.
    if (through) await page.evaluate((index) => {
      const level = window.__parallangLevel;
      const seen = window.__figureWatch = { samples: 0, nearest: Infinity, wrong: [], gone: 0, shrunk: 0, done: false };
      const tick = () => {
        if (seen.done) return;
        const figure = level.figures[index];
        const pose = level.director.pose;
        const away = Math.hypot(pose.position[0] - figure.position[0], pose.position[2] - figure.position[2]);
        seen.samples += 1;
        seen.nearest = Math.min(seen.nearest, away);
        const shown = figure.visible ? figure.scale : 0;
        if (away <= 1.25 && shown === 0) seen.gone += 1;
        if (away > 1.4 && away < 2.0 && shown > 0.02 && shown < 0.98) seen.shrunk += 1;
        if ((away >= 2.15 && shown < 0.99) || (away <= 1.25 && shown > 0)) seen.wrong.push([Math.round(away * 100) / 100, Math.round(shown * 100) / 100]);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, names[through].index);
    await clickButton(page, label);
    await waitFor(page, (index) => window.__parallangLevel.director.mode === 'walk' && window.__parallangLevel.director.site === index, names[to].index);
    const { camera, sheet } = await state(page);
    check(!sheet, 'the dialogue sheet closes when the walk starts');
    check(Math.hypot(...camera.position.map((v, i) => v - before.camera.position[i])) < 1.5, `the walk to ${to} starts where the camera stood (${before.camera.position} to ${camera.position})`);
    let waited = 0;
    for (const [index, fraction] of shots.entries()) {
      const at = camera.arrival * fraction * 1000;
      await sleep(Math.max(0, at - waited));
      waited = at;
      const now = await state(page);
      check(now.phase === 'walk' && !now.sheet && /^Walking to /.test(now.caption ?? ''), `no dialogue while the camera walks (${now.phase}, sheet ${now.sheet}, caption ${now.caption})`);
      await shot(`${name}${shots.length > 1 ? `-${index + 1}` : ''}`, { settle: 0 });
    }
    await waitPhase(page, opens);
    if (through) {
      const seen = await page.evaluate(() => { const watch = window.__figureWatch; watch.done = true; return watch; });
      check(seen.samples > 30 && seen.nearest < 0.6 && seen.gone > 0 && seen.shrunk > 0 && seen.wrong.length === 0,
        `leaving ${through}, the camera walks through its figure's place, and the figure shrinks away and is gone there (${JSON.stringify({ ...seen, wrong: seen.wrong.slice(0, 5) })})`);
    }
    await arrivedAt(to, { sheet: opens === 'encounter' });
  };
  // The temple map: the labels and the fog patches the view shows.
  const mapShows = async (label, sites, hidden) => {
    const now = await state(page);
    check(JSON.stringify(now.labels.map((text) => Number.parseInt(text, 10))) === JSON.stringify(sites), `${label}: the map labels sites ${sites} (${now.labels})`);
    check(JSON.stringify([...now.fog].sort()) === JSON.stringify([...hidden].sort()), `${label}: the fog lies over ${hidden} (${now.fog})`);
  };

  await page.goto(`${ORIGIN}${BASE_PATH}`, { waitUntil: 'load' });
  await waitFor(page, () => Boolean(window.__parallangLevel) && window.__parallang.store.getState().connection === 'ready');
  await shot('01-attract', { settle: 3000 });

  // The world map lies over the same orbit.
  await clickButton(page, 'Enter');
  await waitPhase(page, 'world');
  const world = await page.evaluate(() => ({ places: [...document.querySelectorAll('.place-list strong')].map((element) => element.textContent), mode: window.__parallangLevel.director.mode }));
  check(JSON.stringify(world.places) === JSON.stringify(['Ta Prohm', 'Angkor Wat', 'Micromort Mountain']) && world.mode === 'attract', `the world map shows three places over the orbit (${JSON.stringify(world)})`);
  await shot('02-world', { settle: 600 });

  await clickButton(page, 'Enter Ta Prohm');
  await waitArrived(page, 'overview');
  await shot('03-map-start', { settle: 2600 }); // the site labels fade in after the camera settles
  // Round 122: the level, the dungeon's markers and the seven figures together stay inside the style's budget.
  const triangles = await page.evaluate(() => ({ ...window.__parallangLevel.sceneTriangles, figures: window.__parallangLevel.figures.map((figure) => figure && [figure.name, figure.triangles]) }));
  check(triangles.total <= 64000 && triangles.figures.every(Boolean) && new Set(triangles.figures.map(([name]) => name)).size === 7, `seven figures, and the scene within 64,000 triangles (${JSON.stringify(triangles)})`);
  await mapShows('a new run', [1, 2, 3], ['sunlit_court', 'library', 'before_sanctuary', 'sanctuary']);
  // Round 124: the card says what the dark patches are, inside the card and the window.
  const legend = await page.evaluate(() => {
    const line = document.querySelector('.overview-card .fog-legend');
    if (!line) return null;
    const box = line.getBoundingClientRect();
    const card = line.closest('.card').getBoundingClientRect();
    const swatch = line.querySelector('.fog-swatch').getBoundingClientRect();
    return { text: line.textContent, inside: box.top >= card.top && box.bottom <= card.bottom && box.left >= card.left && box.right <= card.right && box.bottom <= window.innerHeight, swatch: [Math.round(swatch.width), Math.round(swatch.height)] };
  });
  check(legend && /Dark patches cover places you have not found/.test(legend.text) && legend.inside && legend.swatch[0] === 28 && legend.swatch[1] === 28, `the map's card explains the dark patches (${JSON.stringify(legend)})`);
  // Rounds 117 and 118: the installed page on iOS. Chrome cannot emulate display-mode and does not have the bug, so the
  // built stylesheet's installed rules are applied without their condition and a gap of 62 px is set by hand: the
  // shell must reach the bottom of the window and every panel must keep its content 62 px above it.
  const installed = async (label, selectors) => {
    if (size.name !== 'phone') return;
    const layout = await page.evaluate((contentSelectors) => {
      const media = [...document.styleSheets].flatMap((sheet) => [...sheet.cssRules]).find((rule) => rule instanceof CSSMediaRule && rule.conditionText.includes('display-mode: standalone'));
      const style = document.createElement('style');
      style.textContent = media ? [...media.cssRules].map((rule) => rule.cssText).join('\n') : '';
      document.head.append(style);
      const root = document.documentElement;
      const before = root.style.getPropertyValue('--bottom-gap');
      const bottoms = () => Object.fromEntries(contentSelectors.map((selector) => [selector, Math.round(Math.max(...[...document.querySelectorAll(selector)].map((element) => element.getBoundingClientRect().bottom)))]));
      const shellBottom = () => Math.round(document.querySelector('.app-shell').getBoundingClientRect().bottom);
      const flat = { shell: shellBottom(), content: bottoms() };
      root.style.setProperty('--bottom-gap', '62px');
      const gapped = { shell: shellBottom(), content: bottoms(), position: getComputedStyle(document.querySelector('.app-shell')).position, clip: getComputedStyle(document.body).overflow };
      root.style.setProperty('--bottom-gap', before);
      style.remove();
      return { rule: style.textContent, window: innerHeight, before, flat, gapped };
    }, selectors);
    console.log(`installed layout (${label})`, JSON.stringify(layout));
    check(/html, body, #root \{ height: 100vh; overflow: visible; \}/.test(layout.rule) && /\.app-shell \{ position: absolute;/.test(layout.rule), `${label}: the built stylesheet has the installed rules (${layout.rule})`);
    check(layout.before === '0px', `${label}: a browser tab has no gap (${layout.before})`);
    check(layout.gapped.position === 'absolute' && layout.gapped.clip === 'visible', `${label}: installed, the shell lies in the document and the body does not clip (${layout.gapped.position}, ${layout.gapped.clip})`);
    check(layout.flat.shell === layout.window && layout.gapped.shell === layout.window, `${label}: installed, the shell reaches the bottom of the window (${layout.flat.shell}, ${layout.gapped.shell} of ${layout.window})`);
    for (const [selector, bottom] of Object.entries(layout.gapped.content)) {
      check(bottom <= layout.window - 62, `${label}: with a gap of 62, ${selector} ends above it (${bottom} of ${layout.window})`);
      check(layout.flat.content[selector] - bottom === 62, `${label}: the gap lifts ${selector} by 62 (${layout.flat.content[selector]} to ${bottom})`);
    }
  };
  await installed('map', ['.card button', '.site-list']);

  await clickButton(page, 'Start');
  await waitFor(page, () => window.__parallangLevel.director.mode === 'approach');
  const descending = await state(page);
  check(!descending.sheet && descending.camera.stage === 'transition', `no dialogue while the camera comes down (${descending.camera.stage}, sheet ${descending.sheet})`);
  await waitPhase(page, 'encounter');
  await arrivedAt('face_gate');
  await shot('04-face-gate', { settle: 1800 }); // the sheet is up and the camera has slid to the free area
  await answerSite();
  await shot('04-resolved', { settle: 600 }); // stepped in, the beacon released, the ways on

  await walk('Walk to The Root Court', 'root_court', { name: '05-walk', shots: EXTRA ? [0.3, 0.62, 0.86] : [0.3, 0.62] }); // through the gopura, then the gate tree
  await shot('06-root-court', { settle: 1800 });
  // Round 117: the opacity slider in Settings, moved through the interface in the middle of a conversation.
  {
    await installed('conversation', ['.input-bar input', '.input-bar button', '.sheet-scroll']);
    const before = await state(page);
    const look = () => page.evaluate(() => {
      const shell = document.querySelector('.app-shell');
      const background = (selector) => { const element = document.querySelector(selector); return element ? getComputedStyle(element).backgroundImage : null; };
      const rounded = [...shell.querySelectorAll('*')].filter((element) => getComputedStyle(element).borderTopLeftRadius !== '0px').map((element) => element.className || element.tagName);
      return { alpha: shell.style.getPropertyValue('--panel-alpha'), dock: getComputedStyle(document.querySelector('.dock')).visibility, sheet: background('.sheet'), settings: background('.settings-sheet'), rounded: [...new Set(rounded)], stored: localStorage.getItem('parallang.display') };
    });
    const start = await look();
    check(start.alpha === '0.7' && start.sheet?.includes('rgba(62, 64, 62, 0.7)'), `the panels start at 70% (${start.alpha}, ${start.sheet?.slice(0, 120)})`);
    check(start.rounded.length === 0, `no rounded corner on the screen (${start.rounded.join(', ')})`);
    await page.click('button[aria-label="Settings"]');
    await page.waitForSelector('#settings-opacity');
    await page.evaluate(() => {
      const slider = document.querySelector('#settings-opacity');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(slider, '30');
      slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await sleep(200);
    const open = await look();
    check(open.alpha === '0.3' && open.settings?.includes('rgba(62, 64, 62, 0.3)'), `the settings sheet shows the new opacity at once (${open.alpha}, ${open.settings?.slice(0, 120)})`);
    check(open.dock === 'hidden', `the dock is hidden behind the settings sheet (${open.dock})`);
    check(open.rounded.length === 0, `no rounded corner in the settings (${open.rounded.join(', ')})`);
    check(open.stored === '{"panelOpacity":0.3}', `the opacity is stored (${open.stored})`);
    await installed('settings', ['.settings-sheet button', '.build-line']);
    const build = await page.evaluate(async () => ({ line: document.querySelector('.build-line')?.textContent, site: (await (await fetch('./version.json')).json()).build }));
    check(build.line?.includes(`Build ${build.site} · browser tab · window ${size.width}×${size.height}`), `Settings names the build of version.json and the window (${build.line} / ${build.site})`);
    await shot('s-settings-30', { settle: 300 });
    await clickButton(page, 'Close');
    await sleep(200);
    const closed = await look();
    const after = await state(page);
    check(closed.dock === 'visible' && closed.sheet?.includes('rgba(62, 64, 62, 0.3)'), `the dialogue sheet has the new opacity (${closed.dock}, ${closed.sheet?.slice(0, 120)})`);
    check(after.phase === 'encounter' && after.sheet && after.encounter.id === before.encounter.id && after.encounter.version === before.encounter.version, `the conversation went on through the change (${after.phase}, ${after.encounter?.id} v${after.encounter?.version})`);
    await shot('s-root-court-opacity-30', { settle: 300 });
    await page.evaluate(() => window.__parallang.store.getState().setPanelOpacity(0.7));
  }
  await answerSite();

  // Round 120: Gerald could join the party. He is saved, the Party panel names him, and he talks where the player stands.
  {
    const offered = await page.evaluate(() => document.querySelector('.party-offer')?.textContent ?? null);
    check(offered?.includes('Gerald could join your party.'), `the offer shows after Gerald's site (${offered})`);
    await shot('06-party-offer', { settle: 300 });
    await clickButton(page, 'Save Gerald');
    await waitFor(page, () => window.__parallang.store.getState().party.length === 1);
    await clickButton(page, 'Party');
    await page.waitForSelector('.party-panel');
    const panel = await page.evaluate(() => document.querySelector('.party-member')?.textContent ?? null);
    check(panel?.includes('Met at The Root Court · Conversations: 0'), `the panel names Gerald and his site (${panel})`);
    await shot('06-party-panel', { settle: 300 });
    const before = await state(page);
    await clickButton(page, 'Talk to Gerald');
    await waitPhase(page, 'party');
    const talking = await state(page);
    check(talking.sheet && Math.hypot(...talking.camera.position.map((v, i) => v - before.camera.position[i])) < 0.8, `the talk opens where the camera stands (${before.camera.position} to ${talking.camera.position})`);
    await shot('06-party-talk', { settle: 900 });
    for (const answer of passingAnswers(runtime.content, 'gerald_coffee_break')) {
      const version = await page.evaluate(() => window.__parallang.store.getState().encounter.version);
      await page.type('#player-response', answer);
      await clickButton(page, 'Send');
      await waitFor(page, (was) => { const s = window.__parallang.store.getState(); return !s.isLoading && (s.encounter?.version !== was || s.error); }, version);
    }
    const done = await page.evaluate(() => { const s = window.__parallang.store.getState(); return { state: s.encounter?.state, error: s.error, conversations: s.party[0]?.conversations }; });
    check(done.state === 'resolved' && done.conversations === 1, `the talk resolves and counts (${JSON.stringify(done)})`);
    await clickButton(page, 'Back to the temple');
    await waitPhase(page, 'site');
    await arrivedAt('root_court', { sheet: false });
    const hud = await page.evaluate(() => {
      const box = (selector) => { const r = document.querySelector(selector).getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom) }; };
      return { title: box('.hud-title strong'), level: box('.level-chip'), pips: box('.pips'), nav: box('.hud nav'), width: innerWidth };
    });
    const apart = (a, b) => a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
    const parts = ['title', 'level', 'pips', 'nav'];
    check(hud.nav.right <= hud.width && parts.every((a, i) => hud[a].left >= 0 && parts.slice(i + 1).every((b) => apart(hud[a], hud[b]))),
      `the top bar holds the title, the level, the pips and three buttons without overlap (${JSON.stringify(hud)})`);
    // Review 1 of round 121 (R1.4): between a phone and a desktop too, and the title's text must fit its box.
    for (const width of [600, 720, 760, 1024]) {
      await page.setViewport({ ...size, width });
      await sleep(150);
      const at = await page.evaluate(() => {
        const box = (selector) => { const r = document.querySelector(selector).getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom) }; };
        const title = document.querySelector('.hud-title');
        const range = document.createRange();
        range.selectNodeContents(document.querySelector('.hud-title strong'));
        const text = range.getBoundingClientRect();
        return { title: { left: Math.round(text.left), right: Math.round(text.right), top: Math.round(text.top), bottom: Math.round(text.bottom) }, level: box('.level-chip'), pips: box('.pips'), nav: box('.hud nav'), overflow: title.scrollWidth - title.clientWidth, width: innerWidth };
      });
      check(at.nav.right <= at.width && at.overflow <= 0 && parts.every((a, i) => parts.slice(i + 1).every((b) => apart(at[a], at[b]))), `at ${width} px the top bar's title text, level, pips and buttons do not overlap (${JSON.stringify(at)})`);
    }
    await page.setViewport(size);
    await sleep(300);
  }

  // Up to the map: the court's neighbours are out of the fog. A walk is picked there, to Mortimer in the outer court.
  await clickButton(page, 'Map');
  await waitArrived(page, 'overview');
  await shot('07-map-middle', { settle: 2600 });
  await mapShows('from the Root Court', [1, 2, 3, 4, 6], ['library', 'sanctuary']);
  await walk('Walk to The Buttress Tree', 'buttress_tree', { name: 'x-walk-from-the-map', shots: EXTRA ? [0.5] : [] });
  await shot('08-buttress-tree', { settle: 1800 });
  // The player leaves the conversation, sees the site card, and goes back in.
  const talking = await state(page);
  await clickButton(page, 'Leave');
  await waitPhase(page, 'site');
  await arrivedAt('buttress_tree', { sheet: false });
  await shot('08-site-card', { settle: 600 });
  await clickButton(page, 'Back to the conversation');
  await waitPhase(page, 'encounter');
  const back = await state(page);
  check(back.encounter.id === talking.encounter.id && back.encounter.version === talking.encounter.version, `the conversation left is the one returned to (${JSON.stringify(back.encounter)})`);
  await answerSite();

  // Back through the Root Court, which is cleared: its card, and no conversation. Then on to the west.
  await walk('Walk to The Root Court', 'root_court', { opens: 'site' });
  await walk('Walk to The Sunlit Court', 'sunlit_court', { through: 'root_court' }); // the way west leads through Gerald's cart
  await shot('09-sunlit-court', { settle: 1800 });
  await answerSite();
  await walk('Walk to The Library', 'library');
  await shot('10-library', { settle: 1800 });
  await answerSite();
  // The way back is the way the camera came: it turns where it stands.
  await walk('Walk to The Sunlit Court', 'sunlit_court', { opens: 'site', name: 'x-walk-back', shots: EXTRA ? [0.4] : [] });
  await walk('Walk to Before the Sanctuary', 'before_sanctuary');
  await shot('11-before-sanctuary', { settle: 1800 });
  const sealed = await page.evaluate(() => window.__parallang.store.getState().progress.sites.sanctuary);
  check(sealed.gate.sealed && sealed.gate.completed === 5 && !sealed.reachable, `the Sanctuary is sealed with five of six cleared (${JSON.stringify(sealed)})`);
  await answerSite();
  // Round 121: the six are cleared, which is level 4. The Sanctuary asks for level 5, and the way on says so.
  {
    await waitFor(page, () => window.__parallang.store.getState().progress.sites.sanctuary.gate.completed === 6);
    const now = await page.evaluate(() => { const s = window.__parallang.store.getState(); return { gate: s.progress.sites.sanctuary, progression: s.progression, why: document.querySelector('.ways .way-why')?.textContent ?? null }; });
    check(now.progression.level === 4 && now.gate.gate.sealed && !now.gate.reachable && now.why === 'opens at level 5 (you are level 4)', `the Sanctuary is sealed by its level (${JSON.stringify(now)})`);
    await shot('11-level-seal', { settle: 600 });
    // A talk with Gerald, who is in the party, earns the rest.
    await clickButton(page, 'Party');
    await page.waitForSelector('.party-panel');
    await clickButton(page, 'Talk to Gerald');
    await waitPhase(page, 'party');
    for (const answer of passingAnswers(runtime.content, 'gerald_coffee_break')) {
      const version = await page.evaluate(() => window.__parallang.store.getState().encounter.version);
      await page.type('#player-response', answer);
      await clickButton(page, 'Send');
      await waitFor(page, (was) => { const s = window.__parallang.store.getState(); return !s.isLoading && (s.encounter?.version !== was || s.error); }, version);
    }
    const up = await state(page);
    const line = await page.evaluate(() => document.querySelector('.xp-line')?.textContent ?? null);
    check(up.progression.level === 5 && up.levelUp === 5 && /Level 5/.test(line ?? ''), `the talk reaches level 5 and says so (${JSON.stringify(up.progression)}, ${line})`);
    await shot('11-level-up', { settle: 600 });
    await clickButton(page, 'Back to the temple');
    await waitPhase(page, 'site');
    await waitFor(page, () => window.__parallang.store.getState().progress.sites.sanctuary.reachable === true);
  }
  await shot('11-seal-open', { settle: 600 }); // the seal is off: the way to the Sanctuary is offered
  await walk('Walk to The Sanctuary', 'sanctuary');
  await shot('12-sanctuary', { settle: 1800 });
  await answerSite();
  await shot('12-resolved', { settle: 600 });

  await clickButton(page, 'Leave the temple');
  await waitArrived(page, 'victory');
  await shot('13-victory', { settle: 1500 });

  // A reload on a finished run opens the victory screen. The run stays open: the whole map, no fog.
  await page.reload({ waitUntil: 'load' });
  await waitFor(page, () => Boolean(window.__parallangLevel) && window.__parallang.store.getState().phase === 'victory');
  await clickButton(page, 'Stay in the temple');
  await waitArrived(page, 'overview');
  await shot('14-map-complete', { settle: 2600 });
  await mapShows('a finished run', [1, 2, 3, 4, 5, 6, 7], []);
  check(await page.evaluate(() => !document.querySelector('.fog-legend')), 'a finished run: no patch, so no legend');
  // A new run returns to the world map, with the fog back.
  await page.reload({ waitUntil: 'load' });
  await waitFor(page, () => Boolean(window.__parallangLevel) && window.__parallang.store.getState().phase === 'victory');
  await clickButton(page, 'Play again');
  await waitPhase(page, 'world');
  await clickButton(page, 'Enter Ta Prohm');
  await waitArrived(page, 'overview');
  await mapShows('a second run', [1, 2, 3], ['sunlit_court', 'library', 'before_sanctuary', 'sanctuary']);

  // Not part of a normal run: where a reload in the middle of a run lands (an approach to a court and to a gate passage).
  for (const index of EXTRA ? [2, 5, 6] : []) {
    await page.evaluate((site) => { const level = window.__parallangLevel; level.setPhase({ phase: 'approach', siteIndex: site }); level.director.skip(); }, index);
    await shot(`x-resume-site-${index + 1}`, { settle: 1200 });
  }
  await context.close();
  return problems;
}

const content = loadGameContent({ language: 'it' });
const runtime = await createRuntime({ language: 'it', content, provider: new ShotsProvider(content) });
const puppeteer = await loadPuppeteer();
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH,
  headless: true,
  dumpio: process.env.SHOTS_DEBUG === '1',
  // In a batch job the login session's D-Bus address is stale, and Chromium aborts when that bus drops.
  env: { ...process.env, DBUS_SESSION_BUS_ADDRESS: 'disabled:' },
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars'],
});
let failed = false;
try {
  await mkdir(OUT, { recursive: true });
  const log = [];
  for (const size of SIZES) {
    const started = Date.now();
    const problems = await run(browser, runtime, size, log);
    console.log(`${size.name}: played the dungeon in ${((Date.now() - started) / 1000).toFixed(1)} s, ${problems.length} page problems`);
    for (const problem of problems) console.error(' ', problem);
    failed ||= problems.length > 0;
  }
  await writeFile(join(OUT, 'shots.json'), `${JSON.stringify(log, null, 1)}\n`);
} catch (error) {
  failed = true;
  console.error('FAILED', error);
} finally {
  await browser.close();
  await runtime.close();
}
process.exit(failed ? 1 : 0);
