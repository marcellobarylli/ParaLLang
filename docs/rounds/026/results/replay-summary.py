# Round 026: summarises greeting-replay.mjs outputs: per encounter and variant, mean share estimate and mean absolute
# gap |share - requested|; per language, the overall gap per variant and counts more than 0.10 under / over.
#   python3 replay-summary.py replay-it.json replay-es.json
import json, sys
from collections import defaultdict
for path in sys.argv[1:]:
    d = json.load(open(path))
    cells = defaultdict(list)
    errors = 0
    for r in d['results']:
        if 'error' in r: errors += 1; continue
        cells[(r['encounterId'], r['variant'])].append((r['share']['notInTranslation'], r['ratio']))
    print(f"== {d['language']} (errors {errors})")
    tot = defaultdict(list); under = defaultdict(int); over = defaultdict(int)
    for enc in sorted({k[0] for k in cells}):
        row = []
        for v in ('old', 'new'):
            xs = cells.get((enc, v), [])
            if not xs: row.append(f"{v}: -"); continue
            s = sum(x for x, _ in xs) / len(xs); g = sum(abs(x - r) for x, r in xs) / len(xs)
            tot[v] += [abs(x - r) for x, r in xs]
            under[v] += sum(x < r - 0.1 for x, r in xs); over[v] += sum(x > r + 0.1 for x, r in xs)
            row.append(f"{v}: share {s:.2f} gap {g:.2f} {[x for x, _ in xs]}")
        print(f"  {enc:28} req {xs[0][1]:.2f} | " + ' | '.join(row))
    for v in ('old', 'new'):
        n = len(tot[v])
        if n: print(f"  {v}: mean gap {sum(tot[v]) / n:.3f} over {n} greetings; under {under[v]}, over {over[v]}")
