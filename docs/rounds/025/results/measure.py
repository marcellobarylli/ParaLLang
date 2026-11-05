# Round 025: measures play-market.js --location cracked_fountain reports: verdicts per player line, each Flick line's
# requested ratio and share estimate, whether it carries the jingle (both words), and target answers used while
# their objective was still open.
#   python3 measure.py <report.json> ...
import json, re, sys
REFRAIN = {'it': r'dopo,?\s+dopo,?\s+domani', 'es': r'despu[eé]s,?\s+despu[eé]s,?\s+ma[nñ]ana'}
JINGLE = {'it': (r'\bdopo\b', r'\bdomani\b'), 'es': (r'\bdespu[eé]s\b', r'\bma[nñ]ana\b')}
LEAK = {'it': {'stop': r'\b(fermati|fermo|basta)\b', 'direction': r'\b(destra|sinistra|dritto)\b', 'now': r'\b(adesso|ora)\b'},
        'es': {'stop': r'\b(quiet[oa]s?|basta)\b', 'direction': r'\b(derecha|izquierda)\b', 'now': r'\bahora\b'}}
total = {'lines': 0, 'jingle': 0, 'refrain': 0, 'end': 0, 'leaks': 0, 'share': [], 'bare': [], 'req': []}
for path in sys.argv[1:]:
    r = json.load(open(path))
    lang = r['language']
    says = [s for s in r['steps'] if s['name'].startswith('say')]
    print(f"== {path.split('/')[-1]}: resolved={r['resolved']} completedOnMap={r['completedOnMap']} calls={r['generationCalls']} briefing={bool(r.get('companionBriefing'))}")
    passed = set()
    for k, line in enumerate(r['lines']):
        open_ids = [o for o in LEAK[lang] if o not in passed]
        leaks = [o for o in open_ids if re.search(LEAK[lang][o], line['native'], re.I)]
        jingle = all(re.search(p, line['native'], re.I) for p in JINGLE[lang])
        sh = line['share'].get('notInTranslation', 0)
        refrain = re.search(REFRAIN[lang], line['native'], re.I)
        at_end = bool(re.search(REFRAIN[lang] + r'\W*$', line['native'], re.I))
        # Share without the jingle's words (critique 1.3): an estimate that removes their tokens from both counts.
        tok = line['share'].get('tokens', 0)
        jt = sum(len(re.findall(p, line['native'], re.I)) for p in JINGLE[lang])
        bare = (sh * tok - jt) / (tok - jt) if tok - jt > 0 else 0
        total['refrain'] += bool(refrain); total['end'] += at_end; total['bare'].append(max(bare, 0))
        total['lines'] += 1; total['jingle'] += jingle; total['leaks'] += bool(leaks); total['share'].append(sh); total['req'].append(line['requestedRatio'])
        print(f"   L{k} req={line['requestedRatio']:.2f} share={sh:.2f} jingle={'Y' if jingle else '-'}{'R' if refrain else ''}{'E' if at_end else ''} bare={max(bare,0):.2f} leaks={leaks}: {line['native']}")
        if k < len(says):
            s = says[k]
            v = s.get('verdicts') or []
            print(f"     player: {s['name']} -> {[(x['objective'], x['passed']) for x in v]}")
            for x in v:
                if x['passed']: passed.add(x['objective'])
n = total['lines']
if n:
    print(f"TOTAL lines={n} both-words={total['jingle']}/{n} refrain={total['refrain']}/{n} refrain-at-end={total['end']}/{n} leak-lines={total['leaks']} share={sum(total['share'])/n:.2f} without-jingle={sum(total['bare'])/n:.2f} requested={sum(total['req'])/n:.2f}")
