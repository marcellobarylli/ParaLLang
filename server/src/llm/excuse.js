// Round 182: when a character's turn fails for a reason that is not one of the provider errors with their own steps
// (a model overloaded or too slow, a reply that does not fit the game), the player is told what actually happened,
// after a joke: "<name> isn't feeling it right now. His convenient excuse: <the reason>". The reason is built here from
// the error the model's library threw. It names the provider and Google's (or OpenAI's) own words, never a key.

const PROVIDER_NAMES = { gemini: 'Gemini', openai: 'OpenAI', ollama: 'Ollama', anthropic: 'Claude' };
const MAX_DETAIL = 240;

function clip(text) {
  const flat = String(text ?? '').replace(/\s+/g, ' ').trim();
  return flat.length > MAX_DETAIL ? `${flat.slice(0, MAX_DETAIL - 1)}…` : flat;
}

function zodIssues(error) {
  const issues = Array.isArray(error?.issues) ? error.issues : [];
  return issues.slice(0, 2).map((issue) => {
    const where = issue.path?.length ? issue.path.join('.') : 'the reply';
    return `${where}: ${issue.message}`;
  }).join('; ');
}

// Round 182: after retries, the excuse says how often and on which models it was tried.
function triesNote(error) {
  const tried = Array.isArray(error?.attempts) ? error.attempts : [];
  if (tried.length < 2) return '';
  const counts = new Map();
  for (const model of tried) counts.set(model, (counts.get(model) ?? 0) + 1);
  const list = [...counts].map(([model, n]) => (n > 1 ? `${model} ×${n}` : model)).join(', ');
  return ` (tried ${tried.length} times: ${list})`;
}

export function describeFailure(error, providerName = null) {
  const reason = describeOnce(error, providerName);
  const note = triesNote(error);
  if (!note) return reason;
  return reason.endsWith('.') ? `${reason.slice(0, -1)}${note}.` : `${reason}${note}.`;
}

function describeOnce(error, providerName) {
  const who = PROVIDER_NAMES[error?.provider ?? providerName] ?? 'the AI model';
  const name = error?.name ?? '';
  if (name === 'ZodError') return `${who}'s reply did not fit the game's format (${clip(zodIssues(error))}).`;
  if (Number.isInteger(error?.status)) {
    // Google's unwrapped body carries { message, status }; Anthropic's library gives apiMessage and type (round 183).
    const said = error?.error?.message ?? error?.apiMessage;
    const kind = error?.error?.status ?? (typeof error?.type === 'string' ? error.type : null);
    const label = kind ? ` ${kind}` : '';
    if (said) return `${who} answered ${error.status}${label}: "${clip(said)}"`;
    return `${who} answered with error ${error.status}${error.status >= 500 ? ' (a fault or overload on its side)' : ''}.`;
  }
  if (name === 'APIConnectionTimeoutError' || /timed? ?out/i.test(String(error?.message ?? ''))) {
    return `${who} did not answer in time.`;
  }
  if (name === 'APIConnectionError') return `${who} could not be reached (${clip(error?.cause?.message ?? error.message)}).`;
  const message = clip(error?.message);
  return message ? `${who} failed: ${message}` : `${who} failed without saying why.`;
}

export function characterExcuse(label, error, providerName = null) {
  return `${label} isn't feeling it right now. His convenient excuse: ${describeFailure(error, providerName)} Your progress was not changed; retry in a moment.`;
}
