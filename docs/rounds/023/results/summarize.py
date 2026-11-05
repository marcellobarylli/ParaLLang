# Summarises round 023's `play-market.js --party --member` reports: outcome flags, verdicts per player line, the
# party conversation's NPC lines with requested ratio and share estimate, and lines that use a pending objective's
# answer (its authored forms) before the player has passed it.
import json, re, sys, unicodedata
FORMS = {
  'it': {'like_it': ['mi piace'], 'ask_more': ['ancora'], 'lets_go': ['andiamo'], 'together': ['insieme'],
         'praise_story': ['meraviglioso', 'meravigliosa'], 'read_again': ['di nuovo']},
  'es': {'like_it': ['me gusta'], 'ask_more': ['un poco mas'], 'lets_go': ['vamos'], 'together': ['juntos'],
         'praise_story': ['precioso', 'preciosa'], 'read_again': ['otra vez']},
}
fold = lambda t: unicodedata.normalize('NFD', t).encode('ascii', 'ignore').decode().lower()
for path in sys.argv[1:]:
    r = json.load(open(path)); lang = r['language']; c = r['conversation']
    order = [g['output']['objective_results'][0]['objective_id'] for g in c['grading'][:1]]
    ids = [o['objective_id'] for o in c['grading'][0]['output']['objective_results']] if c['grading'] else []
    print(f"== {path.split('/')[-1]}: {c['encounterId']} recruited={r['recruited']} resolved={r['resolved']} offMap={r['conversationOffMap']} count={r['conversations']} calls={r['generationCalls']} scene={c['sceneLocation']}")
    says = [s for s in r['steps'] if s['name'].startswith('say') and s['ok']][len(r['home']['lines']) - 1:]
    passed = set(); leaks_total = 0
    for k, line in enumerate(c['lines']):
        pending = [o for o in ids if o not in passed]
        leaks = [o for o in pending if any(re.search(r'\b' + re.escape(f) + r'\b', fold(line['native'])) for f in FORMS[lang].get(o, []))]
        leaks_total += len(leaks)
        print(f"   L{k} req={line['requestedRatio']:.2f} share={line['share'].get('notInTranslation', 0):.2f} leaks={leaks}: {line['native']}")
        if k < len(says):
            v = says[k]['verdicts']
            print(f"      player {says[k]['name'][4:]} -> {[(x['objective'], x['passed']) for x in v]}")
            passed |= {x['objective'] for x in v if x['passed']}
    for g in c['grading']: print('   feedback:', g['output']['overall_feedback'])
    print('   leaks:', leaks_total)
