# Round 048: summarise the --party --tier 3 reports (verdicts per player line, every NPC line, share, unmet-target leaks).
import json, re, sys, unicodedata
fold = lambda s: ' ' + re.sub(r"[^a-z' ]", ' ', unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode().lower()) + ' '
TARGETS = {  # objective -> folded forms (whole words)
  'calm_him': ['tranquillo', 'tranquilo'], 'promise': ['prometto', 'prometo'],
  'wake_up': ['svegliati', 'despierta', 'despiertate'], 'courage': ['coraggio', 'animo'],
  'here_i_am': ['eccomi', 'aqui estoy'], 'not_alone': ['sola'],
}
for path in sys.argv[1:]:
    r = json.load(open(path))
    c = r['conversation']
    print(f"== {path.split('/')[-1]}: {r['conversationId']} tier {r['tierCount']} resolved {r['resolved']} conversations {r['conversations']} calls {r['generationCalls']}")
    met = set()
    lines, grading = c['lines'], c['grading']
    for i, line in enumerate(lines):
        leaks = [o + ':' + f for o, forms in TARGETS.items() if o not in met for f in forms if f' {f} ' in fold(line['native'])]
        print(f"  NPC {line['turn']} share {line['share']['folded']} vs {line['requestedRatio']}{'  LEAK ' + ','.join(leaks) if leaks else ''}\n     {line['native']}")
        if i < len(grading):
            res = grading[i]['output']['objective_results']
            print('  verdicts: ' + ', '.join(f"{x['objective_id']}={'PASS' if x['passed'] else 'fail'}" for x in res))
            met |= {x['objective_id'] for x in res if x['passed']}
    shares = [l['share']['folded'] for l in lines if l['share']['folded'] is not None]
    print(f"  mean share {sum(shares)/len(shares):.2f} over {len(shares)} lines")
