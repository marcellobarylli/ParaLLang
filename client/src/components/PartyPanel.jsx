// Round 120: the party, in join order, as the app's Party screen has it (mobile/src/components/PartyPanel.js, rounds
// 021, 022 and 047). A member with a conversation can be talked to from anywhere outside a conversation. The app's
// story hint is left out: this client's Spellbook shows no stories (round 120, critique 1.3).

// While Talk offers a deeper conversation (a tier above the first), the card says so.
export function tierNote(member) {
  return Number.isInteger(member.conversationTier) && member.conversationTier > 0 && member.conversationId
    ? `${member.name} trusts you with a deeper conversation now.` : null;
}

export const inParty = (party, encounterId) => (party ?? []).some((member) => member.encounterId === encounterId);

/**
 * `sites` are the dungeon's sites: a member met at one of them is "met at" that site, not at the market's location.
 * `held` is a site conversation under way that the store holds; Talk waits for it. `starting` is the conversation
 * Talk has asked the server for.
 */
export default function PartyPanel({ party, sites = [], held = null, starting = null, canTalk = true, isLoading = false, onTalk, onReturn, returnLabel = 'Back to the temple' }) {
  return (
    <main className="party-panel" aria-label="Your party">
      <div className="panel-heading">
        <div><h2>Your party</h2><p>{party.length === 1 ? '1 member' : `${party.length} members`}</p></div>
        <button type="button" className="secondary-button" onClick={onReturn}>{returnLabel}</button>
      </div>
      {party.length === 0 ? (
        <section className="empty-state"><p>No one has joined you yet. Win someone over who is worth keeping.</p></section>
      ) : (
        <div className="card-grid">
          {party.map((member) => {
            const met = sites.find((site) => site.encounterId === member.encounterId)?.name ?? member.locationName;
            const tier = tierNote(member);
            return (
              <article className="vocabulary-card party-member" key={member.characterId} aria-label={`${member.name}, met at ${met}`}>
                <div className="card-title"><h3>{member.name}</h3></div>
                <p><small>Met at {met} · Conversations: {member.conversations ?? 0}</small></p>
                {tier && <p><em>{tier}</em></p>}
                {member.conversationId && (
                  <button type="button" className="primary-button" disabled={!canTalk || isLoading || Boolean(held) || Boolean(starting)} onClick={() => onTalk(member)}>Talk to {member.name}</button>
                )}
                {starting && starting === member.conversationId && <p role="status"><em>{member.name} is getting ready to talk…</em></p>}
                {member.conversationId && held && <p><small>Finish your conversation with {held.character?.name ?? 'them'} first.</small></p>}
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
