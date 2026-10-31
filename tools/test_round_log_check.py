"""Tests for the round-log check, on a hand-written round 003 in a temporary git repository. Ported from the
assembly repo's tests, on the standard library's unittest instead of pytest.

  python3 -m unittest discover -s tools
"""
from __future__ import annotations

import importlib.util
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("round_log_check", HERE / "round_log_check.py")
rlc = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = rlc
spec.loader.exec_module(rlc)

ARCH = """# Round 003 architecture

## Goal (pre-run)

Build the thing.

## Second opinion (pre-run)

Critiqued draft: `trail/plan-v1.md`; raw text in `trail/critique-1.md`. Interview: `trail/interview.md`.

| # | Type | Finding | +/−/0 | My recommendation | Owner disposition | Where it landed |
|---|---|---|---|---|---|---|
| 1.1 | Error | A \\| B is wrong | 0 | Accept | **Accepted** | Goal |
| 1.2 | Cut | Drop the extra check | − | Accept | **Rejected:** kept for parity | — |

## Outcome (2026-11-01)

See `findings.md`.
"""
CRITIQUE = """# Codex critique 1

- **Findings:** 2

## Raw output (verbatim)

1. **Error — high: A | B is wrong.**
2. **Cut — medium: drop the extra check.**

Optional
1. **Something** extra.
"""
JOURNAL = """# Journal: round 003

| # | Occurred | Recorded | Event | Actor | What | Record |
|---|---|---|---|---|---|---|
| 1 | 09:00 | 09:00 | answer | Owner | Q1 | `interview.md` |
| 2 | 09:30 | 09:30 | critique-returned | Codex, effort high | 2 findings | `critique-1.md` |
| 3 | 10:00 | 10:00 | freeze | Claude | pre-run record | `../architecture.md#goal-pre-run` |
| 4 | 12:00 | 12:00 | run | Claude | npm run verify:cli -- --provider claude-cli | — |
| 5 | 13:00 | 13:00 | closed | Claude | done | `../findings.md` |
"""


def git(repo: Path, *args: str) -> None:
    subprocess.run(["git", "-C", str(repo), *args], check=True, capture_output=True)


class RoundLogCheckTest(unittest.TestCase):
    def setUp(self) -> None:
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.repo = Path(tmp.name)
        self.folder = self.repo / "docs" / "rounds" / "003"
        (self.folder / "trail").mkdir(parents=True)
        (self.folder / "architecture.md").write_text(ARCH)
        (self.folder / "findings.md").write_text("# Findings\n")
        (self.folder / "trail" / "journal.md").write_text(JOURNAL)
        (self.folder / "trail" / "critique-1.md").write_text(CRITIQUE)
        (self.folder / "trail" / "plan-v1.md").write_text("plan\n")
        (self.folder / "trail" / "interview.md").write_text("Q1\n")
        git(self.repo, "init", "-q")
        git(self.repo, "add", ".")
        git(self.repo, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "round 003: pre-run record")

    def errors(self) -> list[str]:
        return rlc.check_round(self.repo, self.folder)

    def assert_reported(self, fragment: str) -> None:
        found = self.errors()
        self.assertTrue(any(fragment in e for e in found), f"{fragment!r} not in {found}")

    def test_complete_round_passes(self) -> None:
        self.assertEqual(self.errors(), [])

    def test_finding_count_stops_at_optional(self) -> None:
        critique = self.folder / "trail" / "critique-1.md"
        critique.write_text(CRITIQUE.replace("- **Findings:** 2\n", ""))
        self.assertEqual(rlc.finding_count(critique), 2)

    def test_missing_disposition_fails(self) -> None:
        (self.folder / "architecture.md").write_text(ARCH.replace("| **Rejected:** kept for parity |", "| — |"))
        self.assert_reported("1.2 has no owner disposition")

    def test_missing_finding_row_fails(self) -> None:
        (self.folder / "trail" / "critique-1.md").write_text(CRITIQUE.replace("- **Findings:** 2", "- **Findings:** 3"))
        self.assert_reported("finding 1.3 has no Second opinion row")

    def test_edited_pre_run_section_fails(self) -> None:
        (self.folder / "architecture.md").write_text(ARCH.replace("Build the thing.", "Build another thing."))
        self.assert_reported("pre-run section changed")

    def test_new_amendment_section_is_allowed(self) -> None:
        (self.folder / "architecture.md").write_text(ARCH + "\n## Amendment 2026-11-01: provider (owner)\n\nChanged.\n")
        self.assertEqual(self.errors(), [])

    def test_unlinked_trail_item_fails(self) -> None:
        (self.folder / "trail" / "review-notes.md").write_text("x\n")
        self.assert_reported("trail/review-notes.md is not linked")

    def test_missing_record_and_bad_numbering_fail(self) -> None:
        journal = self.folder / "trail" / "journal.md"
        journal.write_text(JOURNAL.replace("| 5 | 13:00", "| 6 | 13:00").replace("`interview.md`", "`nowhere.md`"))
        self.assert_reported("not numbered")
        self.assert_reported("`nowhere.md` does not exist")

    def test_closed_round_needs_findings(self) -> None:
        (self.folder / "findings.md").unlink()
        self.assert_reported("findings.md is missing")


if __name__ == "__main__":
    unittest.main()
