// Round 182: when a character's turn fails for a reason that is not one of the provider errors with their own steps
// (a model overloaded or too slow, a reply that does not fit the game), the player is told what actually happened,
// after a joke: "<name> isn't feeling it right now. His convenient excuse: <the reason>". The reason is built here from
// the error the model's library threw. It names the provider and Google's (or OpenAI's) own words, never a key.

const PROVIDER_NAMES = { gemini: 'Gemini', openai: 'OpenAI', ollama: 'Ollama' };
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

export function describeFailure(error, providerName = null) {
  const who = PROVIDER_NAMES[error?.provider ?? providerName] ?? 'the AI model';
  const name = error?.name ?? '';
  if (name === 'ZodError') return `${who}'s reply did not fit the game's format (${clip(zodIssues(error))}).`;
  if (Number.isInteger(error?.status)) {
    const said = error?.error?.message;
    const label = error?.error?.status ? ` ${error.error.status}` : '';
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
