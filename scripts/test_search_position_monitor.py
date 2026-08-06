#!/usr/bin/env python3
"""Regression tests for the ROSPARK search-position monitor."""

from __future__ import annotations

import csv
import json
import subprocess
import sys
import tempfile
import unittest
from argparse import Namespace
from pathlib import Path


SCRIPTS = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS))

from build_search_position_report import build  # noqa: E402
from deliver_search_position_report_personal_max import (  # noqa: E402
    APPROVAL,
    deliver,
    split_report,
)


class SearchPositionMonitorTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.core = self.root / "core.csv"
        with self.core.open("w", encoding="utf-8", newline="") as stream:
            writer = csv.DictWriter(
                stream,
                fieldnames=(
                    "scope",
                    "cluster",
                    "query",
                    "intent",
                    "priority",
                    "target_page",
                    "regions",
                    "query_type",
                    "check_schedule",
                    "status",
                ),
            )
            writer.writeheader()
            for index in range(54):
                writer.writerow(
                    {
                        "scope": "main",
                        "cluster": "test",
                        "query": f"query {index:02d}",
                        "priority": "P0",
                        "target_page": "/",
                        "status": "approved",
                    }
                )
        self.history = self.root / "history.csv"
        self.output = self.root / "generated/seo_position_reports"

    def tearDown(self):
        self.temporary.cleanup()

    def test_report_calculates_previous_delta_best_and_page(self):
        def observations(position: int):
            values = []
            for index in range(54):
                for engine in ("Yandex", "Google"):
                    item = {
                        "query": f"query {index:02d}",
                        "search_engine": engine,
                        "status": "unavailable",
                    }
                    if index == 0 and engine == "Yandex":
                        item.update(
                            status="found",
                            position=position,
                            result_url="https://www.роспарк.рф/",
                        )
                    values.append(item)
            return values

        first = self.root / "first.json"
        first.write_text(
            json.dumps(
                {
                    "measured_at_msk": "2026-08-06T10:00:00+03:00",
                    "region": "Москва",
                    "device": "desktop",
                    "observations": observations(15),
                }
            ),
            encoding="utf-8",
        )
        result_one = build(
            Namespace(
                observations=first,
                core=self.core,
                history=self.history,
                output_dir=self.output,
            )
        )
        second = self.root / "second.json"
        second.write_text(
            json.dumps(
                {
                    "measured_at_msk": "2026-08-10T10:00:00+03:00",
                    "region": "Москва",
                    "device": "desktop",
                    "observations": observations(14),
                }
            ),
            encoding="utf-8",
        )
        result_two = build(
            Namespace(
                observations=second,
                core=self.core,
                history=self.history,
                output_dir=self.output,
            )
        )
        text = Path(result_two["report_path"]).read_text(encoding="utf-8")
        self.assertIn("№14 (стр. 2, место 4); было №15; +1; лучшая №14", text)
        self.assertEqual(result_one["history_rows_appended"], 108)
        self.assertEqual(result_two["history_rows_appended"], 108)

    def test_long_report_is_split_under_safe_limit(self):
        parts = split_report(("строка результата\n" * 400).strip())
        self.assertGreater(len(parts), 1)
        self.assertTrue(all(len(part) <= 3300 for part in parts))

    def test_personal_delivery_is_idempotent(self):
        report_root = self.output.resolve()
        report_root.mkdir(parents=True)
        report = report_root / "report.txt"
        report.write_text("позиции\n" * 10, encoding="utf-8")
        sender = self.root / "fake_sender.py"
        delivery_log = self.root / "delivery.jsonl"
        sender.write_text(
            """#!/usr/bin/env python3
import argparse,json
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--report-path');p.add_argument('--dry-run',action='store_true');a=p.parse_args()
log=Path(r'""" + str(delivery_log) + """')
row={'status':'dry_run','recipient':'director_only','max_send_called':False,'report_path':a.report_path}
if not a.dry_run:
 row.update(status='sent',max_send_called=True,message_id='test-id')
with log.open('a',encoding='utf-8') as f:f.write(json.dumps(row)+'\\n')
""",
            encoding="utf-8",
        )
        args = Namespace(
            report_path=report,
            approval=APPROVAL,
            send=True,
            sender_script=sender,
            delivery_log=delivery_log,
            state=self.root / "state.jsonl",
            lock=self.root / "lock",
        )
        # The production guard uses the repository output root; patch it for this isolated test.
        import deliver_search_position_report_personal_max as delivery_module

        original = delivery_module.ALLOWED_REPORT_ROOT
        delivery_module.ALLOWED_REPORT_ROOT = report_root
        try:
            first = deliver(args)
            second = deliver(args)
        finally:
            delivery_module.ALLOWED_REPORT_ROOT = original
        self.assertEqual(first["status"], "sent")
        self.assertEqual(second["parts"][0]["status"], "already_sent")
        self.assertEqual(len(delivery_log.read_text().splitlines()), 1)


if __name__ == "__main__":
    unittest.main()
