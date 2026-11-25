import { resolve } from 'node:path';
import { createLLMAdapter } from './src/llm/index.js';
import { FriendRouter } from './src/llm/friend-router.js';
import { listenHostForProvider, loadRootEnv, productionTokenProblem, resolveTargetLanguages, saveDirForLanguage } from './src/config.js';
import { loadGameContent } from './src/content-loader.js';
import { JsonLearningStorage } from './src/learning-storage.js';
import { GitHubSaves, MirroredLearningStorage, githubSavesConfig } from './src/github-saves.js';
import { saveSummary } from './src/road/service.js';
import { LearningService } from './src/learning-service.js';
import { createApp } from './src/app.js';

loadRootEnv();

// Round 114: a hosted (production) server never starts without its access token.
const tokenProblem = productionTokenProblem();
if (tokenProblem) {
  console.error(`ParaLLang server not started: ${tokenProblem}`);
  process.exit(1);
}

const port = Number(process.env.PORT || 3001);
const selectedProvider = process.env.LLM_PROVIDER || 'openai';
const host = listenHostForProvider(selectedProvider);
// Round 181: every language the server plays is loaded now, default first (TARGET_LANGUAGES, or TARGET_LANGUAGE alone).
const contents = resolveTargetLanguages().map((language) => loadGameContent({ language }));
// Round 144: the curriculum is read now (the loader reads it on first use), so its content errors stop the start.
const curriculumLine = (content) => (content.curriculum
  ? `Curriculum (${content.language.code}): ${content.curriculum.stages.length} stages, ${content.curriculum.units.length} units, ${content.curriculum.lessonsById.size} lessons`
  : `Curriculum (${content.language.code}): none in this language pack`);
// Round 171: with PARALLANG_FRIEND_CODE set, friends' turns run on Gemini (their own key, or GEMINI_API_KEY) and the
// owner's on LLM_PROVIDER.
const friendCode = (process.env.PARALLANG_FRIEND_CODE || '').trim() || null;
const primaryProvider = createLLMAdapter();
const provider = friendCode
  ? new FriendRouter({ primary: primaryProvider, geminiKey: (process.env.GEMINI_API_KEY || '').trim() || null, geminiModel: (process.env.GEMINI_MODEL || '').trim() || null })
  : primaryProvider;
// Round 145: with a GitHub token and repository the saves are also written to GitHub and read back from there when
// the disk has lost them (github-saves.js). Wrong settings do not stop the server (the game would be down for a
// setting that is optional): saves stay on the disk, and the log and the health check say why.
const githubSettings = githubSavesConfig();
const github = githubSettings?.problem ? null : githubSettings;
const remote = github ? new GitHubSaves(github) : null;
// Each language keeps its saves apart: on the disk in its own folder, on GitHub under its own code (round 003).
const storageFor = (content) => {
  const disk = new JsonLearningStorage({
    saveDir: saveDirForLanguage(process.env.PARALLANG_SAVE_DIR || resolve(import.meta.dirname, 'data', 'saves'), content.language.code),
  });
  return remote
    ? new MirroredLearningStorage({ local: disk, remote, language: content.language.code, describe: (envelope) => saveSummary(content, envelope) })
    : disk;
};
// Round 053: PARALLANG_ATMOSPHERE=on turns the map's LLM atmosphere line on (off by default: the CLI runner is serial).
// Round 076: PARALLANG_PREFETCH=on writes an open encounter's greeting while the player reads the map card (off by
// default: one call per arrival where the player stays 1.5 s).
const flag = (name) => (process.env[name] || '').trim().toLowerCase() === 'on';
const services = Object.fromEntries(contents.map((content) => [content.language.code,
  new LearningService({ provider, storage: storageFor(content), content, atmosphere: flag('PARALLANG_ATMOSPHERE'), prefetch: flag('PARALLANG_PREFETCH') })]));
const [defaultLanguage] = Object.keys(services);
const service = services[defaultLanguage];
const storages = Object.values(services).map((each) => each.storage);
// Round 181: the saves' status is the default language's store's (they share the GitHub settings and repository).
const savesStatus = () => (github ? { ...service.storage.status } : { kind: 'disk', ...(githubSettings?.problem ? { problem: githubSettings.problem } : {}) });
// Round 040 (critique 1.2): the ends are trimmed, as fetch trims header values.
const app = createApp({ services, defaultLanguage, token: (process.env.PARALLANG_TOKEN || '').trim() || null, friendCode, saves: savesStatus });

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(port, host, () => {
    console.log(`ParaLLang server listening on http://${host}:${port}`);
    console.log(`LLM provider: ${selectedProvider}`);
    if (friendCode) console.log(`Friends (PARALLANG_FRIEND_CODE): Gemini, ${process.env.GEMINI_API_KEY ? 'on the server\'s GEMINI_API_KEY or their own key' : 'on their own key only (no GEMINI_API_KEY)'}`);
    for (const each of Object.values(services)) {
      const { language } = each.content;
      console.log(`Target language: ${language.name} (${language.code})${language.code === defaultLanguage ? ', the default' : ''}; saves: ${each.storage.saveDir}`);
      console.log(curriculumLine(each.content));
    }
    if (githubSettings?.problem) console.error(`Saves are on the disk only: ${githubSettings.problem}`);
    else console.log(github ? `Saves are also written to GitHub: ${github.repo}, branch ${github.branch}, folder ${github.dir}` : 'Saves are on the disk only (no PARALLANG_GITHUB_TOKEN and PARALLANG_GITHUB_REPO).');
  });
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    server.close();
    for (const storage of storages) await storage.flush?.(); // round 145: the copies to GitHub still waiting are written before the process ends
    for (const each of Object.values(services)) await each.shutdown();
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}

export { app, service, services };
export default app;
