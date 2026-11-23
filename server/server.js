import { resolve } from 'node:path';
import { createLLMAdapter } from './src/llm/index.js';
import { FriendRouter } from './src/llm/friend-router.js';
import { listenHostForProvider, loadRootEnv, productionTokenProblem, resolveTargetLanguage, saveDirForLanguage } from './src/config.js';
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
const content = loadGameContent({ language: resolveTargetLanguage() });
// Round 144: the curriculum is read now (the loader reads it on first use), so its content errors stop the start.
const curriculumLine = content.curriculum
  ? `Curriculum: ${content.curriculum.stages.length} stages, ${content.curriculum.units.length} units, ${content.curriculum.lessonsById.size} lessons`
  : 'Curriculum: none in this language pack';
// Round 171: with PARALLANG_FRIEND_CODE set, friends' turns run on Gemini (their own key, or GEMINI_API_KEY) and the
// owner's on LLM_PROVIDER.
const friendCode = (process.env.PARALLANG_FRIEND_CODE || '').trim() || null;
const primaryProvider = createLLMAdapter();
const provider = friendCode
  ? new FriendRouter({ primary: primaryProvider, geminiKey: (process.env.GEMINI_API_KEY || '').trim() || null, geminiModel: (process.env.GEMINI_MODEL || '').trim() || null })
  : primaryProvider;
const disk = new JsonLearningStorage({
  saveDir: saveDirForLanguage(process.env.PARALLANG_SAVE_DIR || resolve(import.meta.dirname, 'data', 'saves'), content.language.code),
});
// Round 145: with a GitHub token and repository the saves are also written to GitHub and read back from there when
// the disk has lost them (github-saves.js). Wrong settings do not stop the server (the game would be down for a
// setting that is optional): saves stay on the disk, and the log and the health check say why.
const githubSettings = githubSavesConfig();
const github = githubSettings?.problem ? null : githubSettings;
const storage = github
  ? new MirroredLearningStorage({ local: disk, remote: new GitHubSaves(github), language: content.language.code, describe: (envelope) => saveSummary(content, envelope) })
  : disk;
// Round 053: PARALLANG_ATMOSPHERE=on turns the map's LLM atmosphere line on (off by default: the CLI runner is serial).
// Round 076: PARALLANG_PREFETCH=on writes an open encounter's greeting while the player reads the map card (off by
// default: one call per arrival where the player stays 1.5 s).
const flag = (name) => (process.env[name] || '').trim().toLowerCase() === 'on';
const service = new LearningService({ provider, storage, content, atmosphere: flag('PARALLANG_ATMOSPHERE'), prefetch: flag('PARALLANG_PREFETCH') });
// Round 040 (critique 1.2): the ends are trimmed, as fetch trims header values.
const app = createApp({ service, token: (process.env.PARALLANG_TOKEN || '').trim() || null, friendCode, saves: () => (github ? { ...storage.status } : { kind: 'disk', ...(githubSettings?.problem ? { problem: githubSettings.problem } : {}) }) });

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(port, host, () => {
    console.log(`ParaLLang server listening on http://${host}:${port}`);
    console.log(`LLM provider: ${selectedProvider}`);
    if (friendCode) console.log(`Friends (PARALLANG_FRIEND_CODE): Gemini, ${process.env.GEMINI_API_KEY ? 'on the server\'s GEMINI_API_KEY or their own key' : 'on their own key only (no GEMINI_API_KEY)'}`);
    console.log(`Target language: ${content.language.name} (${content.language.code})`);
    console.log(`Spellbook saves: ${storage.saveDir}`);
    console.log(curriculumLine);
    if (githubSettings?.problem) console.error(`Saves are on the disk only: ${githubSettings.problem}`);
    else console.log(github ? `Saves are also written to GitHub: ${github.repo}, branch ${github.branch}, folder ${github.dir}` : 'Saves are on the disk only (no PARALLANG_GITHUB_TOKEN and PARALLANG_GITHUB_REPO).');
  });
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    server.close();
    await storage.flush?.(); // round 145: the copies to GitHub still waiting are written before the process ends
    await service.shutdown();
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}

export { app, service };
export default app;
