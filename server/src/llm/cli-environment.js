const PASSTHROUGH_KEYS = [
  'HOME', 'USER', 'LOGNAME', 'PATH', 'SHELL', 'TMPDIR', 'TMP', 'TEMP',
  'LANG', 'LC_ALL', 'LC_CTYPE', 'TERM', 'COLORTERM', 'NO_COLOR',
  'XDG_CONFIG_HOME', 'XDG_DATA_HOME', 'XDG_CACHE_HOME',
  'CODEX_HOME', 'CLAUDE_CONFIG_DIR',
];

// Round 018: a Claude subscription OAuth token reaches claude-cli children only (never Codex).
export const CLAUDE_OAUTH_TOKEN_KEY = 'CLAUDE_CODE_OAUTH_TOKEN';

export function createCLIEnvironment(source = process.env, { provider } = {}) {
  const environment = {};
  for (const key of PASSTHROUGH_KEYS) {
    if (typeof source[key] === 'string' && source[key]) environment[key] = source[key];
  }
  if (provider === 'claude-cli' && typeof source[CLAUDE_OAUTH_TOKEN_KEY] === 'string' && source[CLAUDE_OAUTH_TOKEN_KEY]) {
    environment[CLAUDE_OAUTH_TOKEN_KEY] = source[CLAUDE_OAUTH_TOKEN_KEY];
  }
  environment.NO_COLOR = '1';
  environment.TERM = 'dumb';
  return environment;
}

export function assertExecutablePath(value, settingName) {
  if (typeof value !== 'string' || !value.trim() || value.includes('\0') || /[\r\n]/.test(value)) {
    throw new Error(`${settingName} must contain one executable path.`);
  }
  return value;
}
