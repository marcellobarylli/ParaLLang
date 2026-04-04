export async function startEncounter() {
  const res = await fetch('/api/encounter/start', { method: 'POST' });
  if (!res.ok) throw new Error(`Start encounter failed: ${res.status}`);
  return res.json();
}

export async function sendDialogue(message) {
  const res = await fetch('/api/encounter/dialogue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error(`Dialogue failed: ${res.status}`);
  return res.json();
}
