"""Structural check of a round log (rounds 003 onward). It shows that records, links and dispositions exist, not
that summaries are faithful to the trail. Ported from the assembly repo's tools/round_log_check.py, without its
GPU rule for `run` rows.

  python3 tools/round_log_check.py 003          # one round
  python3 tools/round_log_check.py              # every round from 003 on

Checks, per round:
  1. trail/journal.md exists and its rows are numbered 1, 2, 3, ...;
  2. every backticked Record path in the journal exists;
  3. every trail item except journal.md is linked from architecture.md or findings.md;
  4. every critique-K.md (review-K.md) finding has a row K.n (RK.n) with an owner disposition;
  5. sections marked (pre-run) are unchanged since the commit that first added architecture.md;
  6. a round with a `closed` row has findings.md.
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

FIRST_ROUND = 3
CELL_SPLIT = re.compile(r"(?<!\\)\|")
# Codex numbers its findings "1. **Error — high: ...**" at the start of a line.
FINDING = re.compile(r"^(\d+)\. \*\*", re.M)
FINDINGS_HEADER = re.compile(r"^- \*\*Findings:\*\* (\d+)", re.M)
PRE_RUN_HEADING = re.compile(r"^(#+) .*\(pre-run\)", re.M)


def cells(line: str) -> list[str]:
    return [c.strip() for c in CELL_SPLIT.split(line.strip().strip("|"))]


def table_rows(text: str) -> list[list[str]]:
    rows = [cells(line) for line in text.splitlines() if line.lstrip().startswith("|")]
    return [r for r in rows if r and not set("".join(r)) <= set("-: ")]


def journal_rows(journal: Path) -> list[dict[str, str]]:
    rows = table_rows(journal.read_text())
    header, body = rows[0], rows[1:]
    return [dict(zip(header, r)) for r in body]


def finding_count(critique: Path) -> int:
    text = critique.read_text()
    if m := FINDINGS_HEADER.search(text):
        return int(m.group(1))
    raw = re.split(r"^\W*Optional\b", text.split("## Raw output", 1)[-1], maxsplit=1, flags=re.M)[0]
    return len(set(FINDING.findall(raw)))


def pre_run_sections(text: str) -> dict[str, str]:
    sections = {}
    for m in PRE_RUN_HEADING.finditer(text):
        level = len(m.group(1))
        end = re.compile(rf"^#{{1,{level}}} ", re.M).search(text, m.end())
        sections[m.group(0)] = text[m.start():end.start() if end else len(text)].rstrip()
    return sections


def git(repo: Path, *args: str) -> str:
    return subprocess.run(["git", "-C", str(repo), *args], capture_output=True, text=True, check=True).stdout


def check_round(repo: Path, folder: Path) -> list[str]:
    errors: list[str] = []
    trail = folder / "trail"
    journal = trail / "journal.md"
    if not journal.exists():
        return [f"{journal.relative_to(repo)} is missing"]
    rows = journal_rows(journal)

    numbers = [r.get("#", "") for r in rows]
    if numbers != [str(i) for i in range(1, len(rows) + 1)]:
        errors.append(f"journal rows are not numbered 1..{len(rows)}: {numbers}")

    for r in rows:
        for path in re.findall(r"`([^`]+)`", r.get("Record", "")):
            path = path.split("#", 1)[0]
            if not any((base / path).expanduser().exists() for base in (trail, folder, repo)):
                errors.append(f"journal row {r.get('#')}: record `{path}` does not exist")

    main = "\n".join(p.read_text() for p in (folder / "architecture.md", folder / "findings.md") if p.exists())
    for item in sorted(p for p in trail.rglob("*") if p.is_file() and p != journal):
        if str(item.relative_to(trail)) not in main:
            errors.append(f"trail/{item.relative_to(trail)} is not linked from architecture.md or findings.md")

    dispositions = {r[0]: r for r in table_rows(main) if re.fullmatch(r"R?\d+\.\d+", r[0])}
    for record in sorted(trail.glob("critique-*.md")) + sorted(trail.glob("review-*.md")):
        k = record.stem.split("-", 1)[1]
        prefix = ("R" if record.stem.startswith("review") else "") + k
        for n in range(1, finding_count(record) + 1):
            row = dispositions.get(f"{prefix}.{n}")
            if row is None:
                errors.append(f"{record.name}: finding {prefix}.{n} has no Second opinion row")
            elif len(row) < 7 or row[5] in ("", "—", "-"):
                errors.append(f"{record.name}: finding {prefix}.{n} has no owner disposition")

    arch = folder / "architecture.md"
    rel = str(arch.relative_to(repo))
    added = git(repo, "log", "--diff-filter=A", "--format=%H", "--", rel).split()
    if added:
        frozen = pre_run_sections(git(repo, "show", f"{added[-1]}:{rel}"))
        now = pre_run_sections(arch.read_text())
        for heading in frozen.keys() | now.keys():
            if frozen.get(heading) != now.get(heading):
                errors.append(f"pre-run section changed since {added[-1][:7]}: {heading}")

    if any(r.get("Event") == "closed" for r in rows) and not (folder / "findings.md").exists():
        errors.append("round is closed but findings.md is missing")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    parser.add_argument("rounds", nargs="*", help="round numbers, e.g. 003 (default: every round from 003)")
    parser.add_argument("--repo", type=Path, default=None)
    args = parser.parse_args()
    repo = (args.repo or Path(git(Path.cwd(), "rev-parse", "--show-toplevel").strip())).resolve()
    rounds_dir = repo / "docs" / "rounds"
    names = args.rounds or sorted(p.name for p in rounds_dir.iterdir() if p.name.isdigit() and int(p.name) >= FIRST_ROUND)
    if not names:
        print(f"no rounds from {FIRST_ROUND:03d} on yet")
    failed = 0
    for name in names:
        if int(name) < FIRST_ROUND:
            print(f"round {name}: skipped (the round log starts at round {FIRST_ROUND:03d})")
            continue
        errors = check_round(repo, rounds_dir / name)
        failed += bool(errors)
        print(f"round {name}: " + ("ok" if not errors else f"{len(errors)} problem(s)"))
        for e in errors:
            print(f"  - {e}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
