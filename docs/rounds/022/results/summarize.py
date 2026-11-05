# Summarises round 022's `play-market.js --party` reports: outcome flags, verdicts per player line, the coffee
# break's NPC lines with requested ratio and share estimate, and whether a line names an open objective's answer.
import json, re, sys
LEAK = {'it': {'praise_coffee': r'\b(buon[oa]?|buonissim[oa]|ottim[oa])\b', 'thank_gerald': r'\bgrazie\b'},
        'es': {'praise_coffee': r'\b(buen[oa]?|buen[ií]sim[oa]|delicios[oa])\b', 'thank_gerald': r'\bgracias\b'}}
for path in sys.argv[1:]:
    r = json.load(open(path))
    lang = r['language']
    c = r['conversation']
    print(f"== {path.split('/')[-1]}: recruited={r['recruited']} resolved={r['resolved']} offMap={r['conversationOffMap']} conversations={r['conversations']} calls={r['generationCalls']} scene={c['sceneLocation']}")
    for s in r['steps']:
        if s['name'].startswith('say') or not s['ok']:
            v = s.get('verdicts')
            print('  ', 'ok ' if s['ok'] else 'ERR', s['name'], s.get('code') or '', [ (x['objective'], x['passed'], [e['evidence'] for e in x['evidence']]) for x in v ] if v else '')
    # open objectives at each NPC line: before line k, objectives passed so far
    passed = set()
    says = [s for s in r['steps'] if s['name'].startswith('say') and s['ok']]
    home_says = len(r['home']['lines']) - 1
    conv_says = says[home_says:]
    for k, line in enumerate(c['lines']):
        open_ids = [o for o in ['praise_coffee', 'thank_gerald'] if o not in passed]
        leaks = [o for o in open_ids if re.search(LEAK[lang][o], line['native'], re.I)]
        sh = line['share']
        print(f"   L{k} req={line['requestedRatio']:.2f} share={sh.get('notInTranslation', 0):.2f} tok={sh.get('tokens')} leaks={leaks}: {line['native']}")
        if k < len(conv_says):
            for v in conv_says[k]['verdicts']:
                if v['passed']: passed.add(v['objective'])
    for g in c['grading']:
        print('   feedback:', g['output']['overall_feedback'])
