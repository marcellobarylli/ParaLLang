"""Round 020: compare play-market.js tutorial runs. Usage: python3 compare.py label=file1,file2 ..."""
import json, re, statistics as st, sys

LEAKS = {  # objective -> forms that model its answer before it passes
    'greet': r'\b(ciao|buongiorno|buon giorno|hola|buenos d[ií]as)\b',
    'introduce': r'\b(sono|mi chiamo|soy|me llamo)\b',
    'ask_back': r'\b(come ti chiami|c[oó]mo te llamas|e tu|y t[uú])\b',
}

def runs(files):
    for path in files:
        d = json.load(open(path))
        passed = []  # objectives passed before each NPC line
        done = set()
        passed.append(set(done))
        for g in d['grading']:
            for r in g['output']['objective_results']:
                if r['passed']: done.add(r['objective_id'])
            passed.append(set(done))
        yield path, d, passed

for arg in sys.argv[1:]:
    label, files = arg.split('=')
    lines, greet, leaks, over, verdicts = [], [], [], 0, []
    for path, d, passed in runs(files.split(',')):
        for i, l in enumerate(d['lines']):
            s = l['share']
            lines.append((s['notInTranslation'], s['canonical'], s['tokens'], s['tokens'] * s['notInTranslation'], l['requestedRatio']))
            if i == 0: greet.append(s['notInTranslation'])
            if s['notInTranslation'] > l['requestedRatio'] + 0.15: over += 1
            for objective, pattern in LEAKS.items():
                if objective not in passed[min(i, len(passed) - 1)] and re.search(pattern, l['native'], re.I):
                    leaks.append(f"{path.split('/')[-1]} line {i} [{objective}]: {l['native']}")
        verdicts.append((d['resolved'], [[r['passed'] for r in g['output']['objective_results']] for g in d['grading']]))
    m = lambda k: st.mean(x[k] for x in lines)
    print(f"{label}: greeting {greet} mean {st.mean(greet):.2f}; lines nit {m(0):.2f} can {m(1):.2f} req {m(4):.2f}; tokens {m(2):.1f}, target tokens {m(3):.1f}; over req+0.15: {over}/{len(lines)}")
    for v in verdicts: print('   resolved', v[0], v[1])
    for x in leaks: print('   possible leak', x)
